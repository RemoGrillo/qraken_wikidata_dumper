'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import GraphViewer from '@/components/GraphViewer'

interface DumpMetadata {
  id: string
  timestamp: string
  config: {
    classQid: string
    radius: number
    maxInstances: number
    language: string
    includeSubclasses: boolean
  }
  status: string
  phase: string
  startTime: string
  endTime?: string
  progress: {
    itemsSeen: number
    triplesWritten: number
  }
  outputFiles?: {
    nt: string
    ttl: string
  }
  error?: string
}

interface DumpHistoryItem {
  directory: string
  metadata: DumpMetadata
  fileSize?: {
    nt?: number
    ttl?: number
  }
}

export default function HistoryPage() {
  const [dumps, setDumps] = useState<DumpHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDump, setSelectedDump] = useState<string | null>(null)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/history')
      const data = await response.json()
      setDumps(data.dumps || [])
    } catch (error) {
      console.error('Failed to load history:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (directory: string) => {
    if (!confirm('Are you sure you want to delete this dump?')) return
    
    try {
      const response = await fetch(`/api/history?directory=${encodeURIComponent(directory)}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        await loadHistory()
      }
    } catch (error) {
      console.error('Failed to delete dump:', error)
    }
  }

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'N/A'
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`
  }

  const formatDate = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString()
  }

  const handleDownload = (directory: string, format: 'nt' | 'ttl') => {
    const url = `/api/download?id=${directory}&format=${format}`
    window.open(url, '_blank')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Dump History
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                Browse and manage your previous Wikidata dumps
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              New Dump
            </Link>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Empty State */}
          {!loading && dumps.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No dumps yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Start by creating your first Wikidata dump
              </p>
            </div>
          )}

          {/* Dumps List */}
          {!loading && dumps.length > 0 && (
            <div className="space-y-4">
              {dumps.map((dump) => (
                <div
                  key={dump.directory}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {dump.metadata.config.classQid}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          dump.metadata.status === 'completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : dump.metadata.status === 'failed'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {dump.metadata.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Created</p>
                          <p className="text-gray-900 dark:text-white">
                            {formatDate(dump.metadata.timestamp)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Radius</p>
                          <p className="text-gray-900 dark:text-white">
                            {dump.metadata.config.radius}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Instances</p>
                          <p className="text-gray-900 dark:text-white">
                            {dump.metadata.progress.itemsSeen} / {dump.metadata.config.maxInstances}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Triples</p>
                          <p className="text-gray-900 dark:text-white">
                            {dump.metadata.progress.triplesWritten.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      {dump.fileSize && (
                        <div className="mt-3 flex items-center space-x-4 text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            NT: {formatFileSize(dump.fileSize.nt)}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            TTL: {formatFileSize(dump.fileSize.ttl)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {dump.metadata.status === 'completed' && (
                        <>
                          <button
                            onClick={() => handleDownload(dump.directory, 'nt')}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Download N-Triples"
                          >
                            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDownload(dump.directory, 'ttl')}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Download Turtle"
                          >
                            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setSelectedDump(dump.directory)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Visualize Graph"
                          >
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(dump.directory)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete Dump"
                      >
                        <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Graph Viewer Modal */}
      {selectedDump && (
        <GraphViewer
          directory={selectedDump}
          onClose={() => setSelectedDump(null)}
        />
      )}
    </main>
  )
}
