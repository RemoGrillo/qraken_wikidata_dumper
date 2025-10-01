import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs/promises'
import * as path from 'path'
import { Parser, Store, DataFactory, Quad } from 'n3'

const { namedNode } = DataFactory

interface GraphNode {
  id: string
  label: string
  type: 'entity' | 'literal'
  group?: string
}

interface GraphEdge {
  id: string
  source: string
  target: string
  label: string
  predicate: string
}

interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

// Helper to extract label from URI
function getLabel(uri: string): string {
  if (uri.startsWith('http://www.wikidata.org/entity/')) {
    return uri.replace('http://www.wikidata.org/entity/', '')
  }
  if (uri.startsWith('http://www.wikidata.org/prop/direct/')) {
    return uri.replace('http://www.wikidata.org/prop/direct/', '')
  }
  if (uri.includes('#')) {
    return uri.split('#').pop() || uri
  }
  if (uri.includes('/')) {
    return uri.split('/').pop() || uri
  }
  return uri
}

// Helper to determine node group/color based on type
function getNodeGroup(uri: string): string {
  if (uri.startsWith('http://www.wikidata.org/entity/Q')) {
    return 'entity'
  }
  if (uri.startsWith('http://www.wikidata.org/entity/P')) {
    return 'property'
  }
  if (uri.includes('rdf-syntax-ns#type')) {
    return 'type'
  }
  if (uri.includes('rdfs#label')) {
    return 'label'
  }
  return 'other'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { directory, limit = 500 } = body
    
    if (!directory) {
      return NextResponse.json(
        { error: 'Directory parameter is required' },
        { status: 400 }
      )
    }
    
    // Try to parse TTL first, fallback to NT if it fails
    const ttlPath = path.join(process.cwd(), 'dumps', directory, 'dump.ttl')
    const ntPath = path.join(process.cwd(), 'dumps', directory, 'dump.nt')
    
    const store = new Store()
    let parseSuccess = false
    
    // First try TTL
    try {
      await fs.access(ttlPath)
      const ttlContent = await fs.readFile(ttlPath, 'utf-8')
      
      // Parse TTL content
      const parser = new Parser({ format: 'Turtle' })
      
      await new Promise<void>((resolve, reject) => {
        parser.parse(ttlContent, (error, quad) => {
          if (error) {
            reject(error)
          } else if (quad) {
            store.addQuad(quad)
          } else {
            resolve()
          }
        })
      })
      parseSuccess = true
    } catch (ttlError) {
      console.log('TTL parsing failed, trying N-Triples fallback:', ttlError)
      
      // Fallback to N-Triples
      try {
        await fs.access(ntPath)
        const ntContent = await fs.readFile(ntPath, 'utf-8')
        const lines = ntContent.split('\n')
        
        const ntParser = new Parser({ format: 'N-Triples' })
        let lineCount = 0
        
        for (const line of lines) {
          if (!line.trim()) continue
          lineCount++
          
          try {
            await new Promise<void>((resolve) => {
              const lineParser = new Parser({ format: 'N-Triples' })
              lineParser.parse(line, (error, quad) => {
                if (!error && quad) {
                  store.addQuad(quad)
                }
                resolve()
              })
            })
          } catch (lineError) {
            // Skip problematic lines
            console.warn(`Skipping line ${lineCount}`)
          }
        }
        parseSuccess = true
      } catch (ntError) {
        throw new Error('Failed to parse both TTL and NT files')
      }
    }
    
    if (!parseSuccess) {
      throw new Error('Could not parse RDF data')
    }
    
    // Build graph data
    const nodes = new Map<string, GraphNode>()
    const edges: GraphEdge[] = []
    const labels = new Map<string, string>()
    
    // First pass: collect labels
    for (const quad of store.match(
      null,
      namedNode('http://www.w3.org/2000/01/rdf-schema#label'),
      null,
      null
    )) {
      const subject = quad.subject.value
      const object = quad.object.value
      labels.set(subject, object)
    }
    
    // Second pass: build graph (limited to prevent overwhelming the UI)
    let quadCount = 0
    for (const quad of store.match(null, null, null, null)) {
      if (quadCount >= limit) break
      
      const subjectId = quad.subject.value
      const predicateId = quad.predicate.value
      const objectId = quad.object.value
      
      // Skip label predicates in graph (we already extracted them)
      if (predicateId === 'http://www.w3.org/2000/01/rdf-schema#label') {
        continue
      }
      
      // Add subject node
      if (!nodes.has(subjectId)) {
        nodes.set(subjectId, {
          id: subjectId,
          label: labels.get(subjectId) || getLabel(subjectId),
          type: 'entity',
          group: getNodeGroup(subjectId),
        })
      }
      
      // Add object node
      if (quad.object.termType === 'NamedNode') {
        if (!nodes.has(objectId)) {
          nodes.set(objectId, {
            id: objectId,
            label: labels.get(objectId) || getLabel(objectId),
            type: 'entity',
            group: getNodeGroup(objectId),
          })
        }
      } else {
        // Literal node
        const literalId = `literal_${quadCount}`
        if (!nodes.has(literalId)) {
          let literalLabel = quad.object.value
          if (literalLabel.length > 50) {
            literalLabel = literalLabel.substring(0, 50) + '...'
          }
          nodes.set(literalId, {
            id: literalId,
            label: literalLabel,
            type: 'literal',
            group: 'literal',
          })
        }
        // Update objectId for edge
        const actualObjectId = literalId
        
        // Add edge
        edges.push({
          id: `edge_${quadCount}`,
          source: subjectId,
          target: actualObjectId,
          label: getLabel(predicateId),
          predicate: predicateId,
        })
        
        quadCount++
        continue
      }
      
      // Add edge for named nodes
      edges.push({
        id: `edge_${quadCount}`,
        source: subjectId,
        target: objectId,
        label: getLabel(predicateId),
        predicate: predicateId,
      })
      
      quadCount++
    }
    
    const graphData: GraphData = {
      nodes: Array.from(nodes.values()),
      edges,
    }
    
    return NextResponse.json({
      graph: graphData,
      totalQuads: store.size,
      displayedQuads: quadCount,
    })
  } catch (error) {
    console.error('Failed to visualize TTL:', error)
    return NextResponse.json(
      { error: 'Failed to parse TTL file' },
      { status: 500 }
    )
  }
}
