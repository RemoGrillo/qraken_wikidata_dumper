import { DumpConfig, DumpJob, DumpProgress } from '@/lib/types'
import { generateJobId, chunkArray, calculateEta } from '@/lib/utils'
import { wdqsClient } from './wdqsClient'
import { mwApi } from './mwapi'
import { constructForRadius, constructEstimate, extractNeighbors } from './construct'
import { expandSubclasses } from './subclasses'
import { constructPropertyMetadata, extractPropertyIds } from './propertyEnrichment'
import * as fs from 'fs/promises'
import * as path from 'path'
import { Writer as N3Writer, DataFactory } from 'n3'
import { Readable } from 'stream'

const BATCH_SIZE = 200 // Entities per CONSTRUCT query
const SAMPLE_SIZE = 100 // For estimation

export class DumpOrchestrator {
  private job: DumpJob
  private progressCallback?: (progress: DumpProgress) => void
  private abortController: AbortController

  constructor(config: DumpConfig) {
    this.job = {
      id: generateJobId(),
      config,
      status: 'pending',
      phase: 'initializing',
      progress: {
        phase: 'initializing',
        itemsSeen: 0,
        triplesWritten: 0,
      },
      startTime: new Date(),
    }
    this.abortController = new AbortController()
  }

  /**
   * Set progress callback
   */
  onProgress(callback: (progress: DumpProgress) => void) {
    this.progressCallback = callback
  }

  /**
   * Update and emit progress
   */
  private updateProgress(updates: Partial<DumpProgress>) {
    this.job.progress = { ...this.job.progress, ...updates }
    this.progressCallback?.(this.job.progress)
  }

  /**
   * Main dump execution
   */
  async execute(): Promise<DumpJob> {
    try {
      this.job.status = 'running'
      
      // Create timestamped directory for this dump
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const dumpDir = path.join(process.cwd(), 'dumps', `${timestamp}_${this.job.config.classQid}`)
      await fs.mkdir(dumpDir, { recursive: true })
      
      const ntFile = path.join(dumpDir, 'dump.nt')
      const ttlFile = path.join(dumpDir, 'dump.ttl')
      const metadataFile = path.join(dumpDir, 'metadata.json')
      
      // Save initial metadata
      await this.saveMetadata(metadataFile)
      
      // Phase A: Expand subclasses if needed
      let classQids = [this.job.config.classQid]
      if (this.job.config.includeSubclasses) {
        this.updateProgress({ phase: 'expanding-subclasses', message: 'Expanding subclasses...' })
        classQids = await expandSubclasses(this.job.config.classQid)
      }
      
      // Phase B: Enumerate instances
      this.updateProgress({ phase: 'enumerating-instances', message: 'Enumerating instances...' })
      const instances: string[] = []
      
      for await (const qid of mwApi.enumerateInstances(classQids, this.job.config.maxInstances)) {
        if (this.abortController.signal.aborted) {
          throw new Error('Job aborted')
        }
        instances.push(qid)
        
        if (instances.length % 100 === 0) {
          this.updateProgress({ 
            itemsSeen: instances.length,
            message: `Found ${instances.length} instances...`
          })
        }
      }
      
      this.updateProgress({ 
        totalItems: instances.length,
        message: `Found ${instances.length} total instances`
      })
      
      // Phase C: Estimate triples
      this.updateProgress({ phase: 'estimating-triples', message: 'Estimating triples...' })
      const estimatedTriples = await this.estimateTriples(instances.slice(0, SAMPLE_SIZE))
      const totalEstimate = Math.round((estimatedTriples / Math.min(SAMPLE_SIZE, instances.length)) * instances.length)
      
      this.updateProgress({ 
        estimatedTriples: totalEstimate,
        message: `Estimated ~${totalEstimate} triples`
      })
      
      // Phase D: Iterative Radius Crawling
      let triplesWritten = 0
      const visited = new Set<string>()  // Track already processed entities
      const ntStream = await fs.open(ntFile, 'w')
      
      // Start with instances as entities to process
      let currentEntities = new Set<string>(instances)
      
      // Process each radius level
      for (let currentRadius = 1; currentRadius <= this.job.config.radius; currentRadius++) {
        if (currentEntities.size === 0) {
          this.updateProgress({ 
            message: `No new entities to process at radius ${currentRadius}` 
          })
          break
        }
        
        this.updateProgress({ 
          phase: currentRadius === 1 ? 'fetching-r1' : 'fetching-r2', 
          message: `Fetching radius ${currentRadius} data (${currentEntities.size} entities)...` 
        })
        
        const nextNeighbors = new Set<string>()
        
        // Filter out already visited entities
        const entitiesToProcess = Array.from(currentEntities).filter(qid => !visited.has(qid))
        
        if (entitiesToProcess.length === 0) {
          this.updateProgress({ 
            message: `All entities at radius ${currentRadius} already visited` 
          })
          continue
        }
        
        // Mark as visited
        entitiesToProcess.forEach(qid => visited.add(qid))
        
        // Process in batches
        const batches = chunkArray(entitiesToProcess, BATCH_SIZE)
        const totalBatchesUpToNow = visited.size / BATCH_SIZE
        
        for (let i = 0; i < batches.length; i++) {
          if (this.abortController.signal.aborted) {
            throw new Error('Job aborted')
          }
          
          const batch = batches[i]
          const query = constructForRadius(batch, this.job.config.language)
          const ntriples = await wdqsClient.construct(query)
          
          // Write to file
          await ntStream.write(ntriples)
          
          // Extract neighbors for next radius (if not at max radius)
          if (currentRadius < this.job.config.radius) {
            const batchNeighbors = extractNeighbors(ntriples)
            batchNeighbors.forEach(qid => {
              // Only add if not already visited
              if (!visited.has(qid)) {
                nextNeighbors.add(qid)
              }
            })
          }
          
          // Count triples
          triplesWritten += ntriples.split('\n').filter(line => line.trim()).length
          
          const progressPercent = ((visited.size / (instances.length * Math.pow(2, this.job.config.radius))) * 100).toFixed(1)
          
          this.updateProgress({
            itemsSeen: visited.size,
            triplesWritten,
            message: `R${currentRadius}: Batch ${i + 1}/${batches.length} (${visited.size} entities processed, ~${progressPercent}% estimated)`
          })
        }
        
        // Prepare for next radius
        currentEntities = nextNeighbors
        
        if (currentRadius < this.job.config.radius && nextNeighbors.size > 0) {
          this.updateProgress({ 
            message: `Found ${nextNeighbors.size} new neighbors for radius ${currentRadius + 1}` 
          })
        }
      }
      
      await ntStream.close()
      
      this.updateProgress({ 
        message: `Completed radius crawling: ${visited.size} unique entities, ${triplesWritten} triples` 
      })
      
      // Phase E: Fetch property metadata (if enabled)
      if (this.job.config.includePropertyMetadata !== false) {  // Default to true
        this.updateProgress({ 
          phase: 'enriching-properties', 
          message: 'Fetching property metadata...' 
        })
        
        // Read the NT file to extract property IDs
        const ntContent = await fs.readFile(ntFile, 'utf-8')
        const propertyIds = extractPropertyIds(ntContent)
        
        console.log(`[Property Enrichment] Found ${propertyIds.size} unique properties:`, Array.from(propertyIds).slice(0, 10).join(', '))
        
        if (propertyIds.size > 0) {
          const propertyArray = Array.from(propertyIds)
          const propertyBatches = chunkArray(propertyArray, 50) // Smaller batches for properties
          
          // Reopen file for appending
          const ntStreamAppend = await fs.open(ntFile, 'a')
          
          for (let i = 0; i < propertyBatches.length; i++) {
            if (this.abortController.signal.aborted) {
              throw new Error('Job aborted')
            }
            
            const batch = propertyBatches[i]
            const query = constructPropertyMetadata(batch, this.job.config.language)
            const ntriples = await wdqsClient.construct(query)
            
            // Append to file
            await ntStreamAppend.write(ntriples)
            
            triplesWritten += ntriples.split('\n').filter(line => line.trim()).length
            
            this.updateProgress({
              triplesWritten,
              message: `Fetching property metadata ${i + 1}/${propertyBatches.length}...`
            })
          }
          
          await ntStreamAppend.close()
          
          this.updateProgress({
            message: `Enriched ${propertyIds.size} properties with metadata`
          })
        }
      }
      
      // Phase F: Convert to Turtle
      this.updateProgress({ 
        phase: 'converting-ttl', 
        message: 'Converting to Turtle format...'
      })
      
      await this.convertToTurtle(ntFile, ttlFile)
      
      // Complete
      this.job.status = 'completed'
      this.job.phase = 'completed'
      this.job.endTime = new Date()
      this.job.outputFiles = {
        nt: ntFile,
        ttl: ttlFile,
      }
      
      // Save final metadata
      await this.saveMetadata(metadataFile)
      
      this.updateProgress({
        phase: 'completed',
        message: `Dump completed! ${triplesWritten} triples written.`,
        eta: undefined,
      })
      
      return this.job
    } catch (error) {
      this.job.status = 'failed'
      this.job.error = error instanceof Error ? error.message : 'Unknown error'
      this.job.endTime = new Date()
      throw error
    }
  }

  /**
   * Estimate total triples by sampling
   */
  private async estimateTriples(sampleQids: string[]): Promise<number> {
    if (sampleQids.length === 0) return 0
    
    try {
      const query = constructEstimate(sampleQids)
      const response = await wdqsClient.select(query)
      
      let total = 0
      for (const binding of response.results.bindings) {
        const count = parseInt(binding.count.value, 10)
        total += count
      }
      
      return total
    } catch (error) {
      console.error('Failed to estimate triples:', error)
      // Rough fallback estimate
      return sampleQids.length * 20
    }
  }

  /**
   * Save metadata to file
   */
  private async saveMetadata(metadataFile: string): Promise<void> {
    const metadata = {
      id: this.job.id,
      timestamp: new Date().toISOString(),
      config: this.job.config,
      status: this.job.status,
      phase: this.job.phase,
      startTime: this.job.startTime,
      endTime: this.job.endTime,
      progress: this.job.progress,
      outputFiles: this.job.outputFiles,
      error: this.job.error,
    }
    
    await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2))
  }

  /**
   * Convert N-Triples to Turtle
   * Uses N3 Parser and Store for proper grouping of triples
   */
  private async convertToTurtle(ntFile: string, ttlFile: string): Promise<void> {
    const ntContent = await fs.readFile(ntFile, 'utf-8')
    
    // Use N3 Parser to properly parse N-Triples
    const { Parser, Writer, Store } = await import('n3')
    const store = new Store()
    
    // Parse all N-Triples into a store with preprocessing for problematic strings
    const lines = ntContent.split('\n')
    let lineNumber = 0
    let skippedLines = 0
    
    for (const line of lines) {
      lineNumber++
      if (!line.trim()) continue
      
      try {
        // Create a parser for this line
        const lineParser = new Parser({ format: 'N-Triples' })
        
        // Parse the line
        await new Promise<void>((resolve, reject) => {
          lineParser.parse(line, (error, quad) => {
            if (error) {
              console.warn(`Warning: Line ${lineNumber} parse error: ${error.message}`)
              console.warn(`  Problematic line: ${line.substring(0, 200)}...`)
              skippedLines++
              resolve() // Skip but continue
            } else if (quad) {
              // Successfully parsed, add to store
              try {
                store.addQuad(quad)
              } catch (storeError) {
                console.warn(`Warning: Could not add quad from line ${lineNumber}: ${storeError}`)
                skippedLines++
              }
              resolve()
            } else {
              // End of this line's parsing
              resolve()
            }
          })
        })
      } catch (err) {
        console.warn(`Warning: Failed to process line ${lineNumber}: ${err}`)
        skippedLines++
      }
    }
    
    if (skippedLines > 0) {
      console.log(`Note: Skipped ${skippedLines} lines during TTL conversion (may contain complex literals)`)
    }
    
    // Create Turtle writer with proper prefixes
    const writer = new Writer({
      prefixes: {
        wd: 'http://www.wikidata.org/entity/',
        wdt: 'http://www.wikidata.org/prop/direct/',
        rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
        schema: 'http://schema.org/',
        skos: 'http://www.w3.org/2004/02/skos/core#',
        wikibase: 'http://wikiba.se/ontology#',
      }
    })
    
    // Add all quads from store to writer
    // The writer will automatically group triples and format them properly
    const quads = store.getQuads(null, null, null, null)
    writer.addQuads(quads)
    
    // Write to file
    return new Promise<void>((resolve, reject) => {
      writer.end((error: Error | null | undefined, result: string) => {
        if (error) {
          reject(error)
        } else {
          fs.writeFile(ttlFile, result)
            .then(() => resolve())
            .catch(reject)
        }
      })
    })
  }

  /**
   * Abort the dump job
   */
  abort() {
    this.abortController.abort()
  }

  /**
   * Get current job status
   */
  getJob(): DumpJob {
    return this.job
  }
}
