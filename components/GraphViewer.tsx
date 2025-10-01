'use client'

import { useEffect, useRef, useState } from 'react'
import cytoscape from 'cytoscape'
import fcose from 'cytoscape-fcose'

// Register the fcose layout
cytoscape.use(fcose)

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

interface GraphViewerProps {
  directory: string
  onClose: () => void
}

export default function GraphViewer({ directory, onClose }: GraphViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [graphInfo, setGraphInfo] = useState<{ totalQuads: number; displayedQuads: number } | null>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)

  useEffect(() => {
    loadGraph()
    
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy()
      }
    }
  }, [directory])

  const loadGraph = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/visualize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ directory, limit: 500 }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to load graph data')
      }
      
      const data = await response.json()
      setGraphInfo({ totalQuads: data.totalQuads, displayedQuads: data.displayedQuads })
      
      if (containerRef.current) {
        renderGraph(data.graph)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph')
    } finally {
      setLoading(false)
    }
  }

  const renderGraph = (graphData: GraphData) => {
    if (!containerRef.current) return
    
    // Destroy existing graph if any
    if (cyRef.current) {
      cyRef.current.destroy()
    }
    
    // Create Cytoscape elements
    const elements = [
      ...graphData.nodes.map(node => ({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          group: node.group,
        },
      })),
      ...graphData.edges.map(edge => ({
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label,
        },
      })),
    ]
    
    // Initialize Cytoscape
    cyRef.current = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele: any) => {
              const group = ele.data('group')
              switch (group) {
                case 'entity': return '#3b82f6'
                case 'property': return '#10b981'
                case 'type': return '#f59e0b'
                case 'literal': return '#8b5cf6'
                default: return '#6b7280'
              }
            },
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '10px',
            'width': 30,
            'height': 30,
            'text-wrap': 'wrap',
            'text-max-width': '80px',
            'border-width': 2,
            'border-color': '#fff',
          },
        },
        {
          selector: 'node[type="literal"]',
          style: {
            'shape': 'rectangle',
            'width': 60,
            'height': 20,
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#9ca3af',
            'target-arrow-color': '#9ca3af',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '8px',
            'text-rotation': 'autorotate',
            'text-margin-y': -10,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'background-color': '#ef4444',
            'border-color': '#dc2626',
            'border-width': 3,
          },
        },
      ],
      layout: {
        name: 'fcose',
        quality: 'proof',
        randomize: true,
        animate: true,
        animationDuration: 1000,
        fit: true,
        padding: 50,
        nodeRepulsion: 8000,
        idealEdgeLength: 100,
        edgeElasticity: 0.45,
        nestingFactor: 0.1,
        numIter: 2500,
        tile: true,
      } as any,
      minZoom: 0.1,
      maxZoom: 5,
      wheelSensitivity: 0.2,
    })
    
    // Add click handler for nodes
    cyRef.current.on('tap', 'node', (evt) => {
      const node = evt.target
      console.log('Node clicked:', node.data())
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              RDF Graph Visualization
            </h2>
            {graphInfo && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Showing {graphInfo.displayedQuads} of {graphInfo.totalQuads} triples
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Graph Container */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading graph...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}
          
          <div ref={containerRef} className="w-full h-full" />
        </div>
        
        {/* Controls */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Entity</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Property</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Literal</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Type</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => cyRef.current?.fit()}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Fit to Screen
              </button>
              <button
                onClick={() => cyRef.current?.reset()}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Reset View
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
