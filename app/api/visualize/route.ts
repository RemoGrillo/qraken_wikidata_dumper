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
    const { 
      directory, 
      limit = 1500, 
      maxDeadEndConnections = 10 
    } = body
    
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
    
    // Collect labels first
    const labels = new Map<string, string>()
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
    
    // Build complete graph structure for analysis
    const allNodes = new Map<string, GraphNode>()
    const allEdges: GraphEdge[] = []
    const nodeConnections = new Map<string, Set<string>>() // Track connections per node
    const incomingConnections = new Map<string, Set<string>>() // Track incoming edges
    const outgoingConnections = new Map<string, Set<string>>() // Track outgoing edges
    
    let tempEdgeId = 0
    
    // Build full graph structure
    for (const quad of store.match(null, null, null, null)) {
      const subjectId = quad.subject.value
      const predicateId = quad.predicate.value
      let objectId = quad.object.value
      
      // Skip label predicates in graph (we already extracted them)
      if (predicateId === 'http://www.w3.org/2000/01/rdf-schema#label') {
        continue
      }
      
      // Add subject node
      if (!allNodes.has(subjectId)) {
        allNodes.set(subjectId, {
          id: subjectId,
          label: labels.get(subjectId) || getLabel(subjectId),
          type: 'entity',
          group: getNodeGroup(subjectId),
        })
      }
      
      // Handle object node
      if (quad.object.termType === 'NamedNode') {
        if (!allNodes.has(objectId)) {
          allNodes.set(objectId, {
            id: objectId,
            label: labels.get(objectId) || getLabel(objectId),
            type: 'entity',
            group: getNodeGroup(objectId),
          })
        }
      } else {
        // Literal node
        objectId = `literal_${tempEdgeId}`
        if (!allNodes.has(objectId)) {
          let literalLabel = quad.object.value
          if (literalLabel.length > 50) {
            literalLabel = literalLabel.substring(0, 50) + '...'
          }
          allNodes.set(objectId, {
            id: objectId,
            label: literalLabel,
            type: 'literal',
            group: 'literal',
          })
        }
      }
      
      // Add edge
      allEdges.push({
        id: `edge_${tempEdgeId++}`,
        source: subjectId,
        target: objectId,
        label: getLabel(predicateId),
        predicate: predicateId,
      })
      
      // Track connections
      if (!nodeConnections.has(subjectId)) nodeConnections.set(subjectId, new Set())
      if (!nodeConnections.has(objectId)) nodeConnections.set(objectId, new Set())
      nodeConnections.get(subjectId)!.add(objectId)
      nodeConnections.get(objectId)!.add(subjectId)
      
      if (!outgoingConnections.has(subjectId)) outgoingConnections.set(subjectId, new Set())
      outgoingConnections.get(subjectId)!.add(objectId)
      
      if (!incomingConnections.has(objectId)) incomingConnections.set(objectId, new Set())
      incomingConnections.get(objectId)!.add(subjectId)
    }
    
    // Identify dead-end nodes (nodes with only one connection)
    const deadEndNodes = new Set<string>()
    for (const [nodeId, connections] of nodeConnections.entries()) {
      if (connections.size === 1) {
        deadEndNodes.add(nodeId)
      }
    }
    
    // Prune edges intelligently
    const prunedEdges: GraphEdge[] = []
    const prunedNodes = new Set<string>()
    const deadEndConnectionsPerNode = new Map<string, number>()
    
    // Priority predicates that should always be included
    const priorityPredicates = new Set([
      'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
      'http://www.wikidata.org/prop/direct/P31', // instance of
      'http://www.wikidata.org/prop/direct/P279', // subclass of
    ])
    
    for (const edge of allEdges) {
      const isSourceDeadEnd = deadEndNodes.has(edge.source)
      const isTargetDeadEnd = deadEndNodes.has(edge.target)
      const isPriority = priorityPredicates.has(edge.predicate)
      
      // Always include priority predicates
      if (isPriority) {
        prunedEdges.push(edge)
        prunedNodes.add(edge.source)
        prunedNodes.add(edge.target)
        continue
      }
      
      // If both nodes are well-connected, always include
      if (!isSourceDeadEnd && !isTargetDeadEnd) {
        prunedEdges.push(edge)
        prunedNodes.add(edge.source)
        prunedNodes.add(edge.target)
        continue
      }
      
      // If target is a dead end, check limits
      if (isTargetDeadEnd) {
        const currentDeadEnds = deadEndConnectionsPerNode.get(edge.source) || 0
        if (currentDeadEnds < maxDeadEndConnections) {
          prunedEdges.push(edge)
          prunedNodes.add(edge.source)
          prunedNodes.add(edge.target)
          deadEndConnectionsPerNode.set(edge.source, currentDeadEnds + 1)
        }
      } else {
        // Source is dead end but target is not - include it
        prunedEdges.push(edge)
        prunedNodes.add(edge.source)
        prunedNodes.add(edge.target)
      }
      
      // Stop if we've reached the limit
      if (prunedEdges.length >= limit) break
    }
    
    // Build final graph data
    const finalNodes: GraphNode[] = []
    for (const nodeId of prunedNodes) {
      if (allNodes.has(nodeId)) {
        finalNodes.push(allNodes.get(nodeId)!)
      }
    }
    
    const graphData: GraphData = {
      nodes: finalNodes,
      edges: prunedEdges.slice(0, limit),
    }
    
    // Calculate pruning statistics
    const totalDeadEnds = deadEndNodes.size
    const prunedDeadEnds = Array.from(prunedNodes).filter(n => deadEndNodes.has(n)).length
    const prunedOutDeadEnds = totalDeadEnds - prunedDeadEnds
    
    return NextResponse.json({
      graph: graphData,
      totalQuads: store.size,
      displayedQuads: prunedEdges.length,
      pruningStats: {
        totalNodes: allNodes.size,
        totalEdges: allEdges.length,
        totalDeadEnds,
        prunedDeadEnds,
        prunedOutDeadEnds,
        maxDeadEndConnections
      }
    })
  } catch (error) {
    console.error('Failed to visualize TTL:', error)
    return NextResponse.json(
      { error: 'Failed to parse TTL file' },
      { status: 500 }
    )
  }
}
