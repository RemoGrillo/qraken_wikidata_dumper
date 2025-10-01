'use client'

import { useState, useEffect } from 'react'
import GraphViewer from './GraphViewer'

interface DownloadLinksProps {
  jobId: string
}

export default function DownloadLinks({ jobId }: DownloadLinksProps) {
  const [showGraph, setShowGraph] = useState(false)
  const [directory, setDirectory] = useState<string | null>(null)
  
  useEffect(() => {
    // Get job details to extract the directory
    fetch(`/api/job?id=${jobId}`)
      .then(res => res.json())
      .then(data => {
        if (data.job?.outputFiles?.nt) {
          // Extract directory from file path
          // e.g., /path/to/dumps/2025-10-01T12-17-42_Q3305213/dump.nt
          const match = data.job.outputFiles.nt.match(/dumps\/([^\/]+)\//)
          if (match && match[1]) {
            setDirectory(match[1])
          }
        }
      })
      .catch(err => {
        console.error('Failed to get job details:', err)
        // Fallback: use jobId as directory (might work for recent jobs)
        setDirectory(jobId)
      })
  }, [jobId])
  
  const handleDownload = (format: 'nt' | 'ttl') => {
    const url = `/api/download?id=${jobId}&format=${format}`
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <svg
          className="mx-auto h-12 w-12 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
          Dump Completed Successfully!
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Your Wikidata dump is ready for download
        </p>
      </div>

      <div className="mb-4">
        <button
          onClick={() => setShowGraph(true)}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Visualize RDF Graph
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
        <button
          onClick={() => handleDownload('nt')}
          className="group relative bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg p-6 hover:border-blue-500 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                N-Triples Format
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                .nt file - Line-based RDF format
              </p>
            </div>
            <svg
              className="h-8 w-8 text-gray-400 group-hover:text-blue-500 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
              />
            </svg>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500 dark:text-gray-400">
            <svg
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Simple, streamable format
          </div>
        </button>

        <button
          onClick={() => handleDownload('ttl')}
          className="group relative bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg p-6 hover:border-blue-500 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Turtle Format
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                .ttl file - Compact RDF format
              </p>
            </div>
            <svg
              className="h-8 w-8 text-gray-400 group-hover:text-blue-500 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
              />
            </svg>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500 dark:text-gray-400">
            <svg
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Human-readable with prefixes
          </div>
        </button>
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex">
          <svg
            className="h-5 w-5 text-blue-400 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Download Information
            </h3>
            <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
              <ul className="list-disc list-inside space-y-1">
                <li>Files contain truthy Wikidata statements (wdt: predicates)</li>
                <li>Includes labels in the selected language</li>
                <li>Instance types are mapped to rdf:type</li>
                <li>Downloads will open in a new tab</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {showGraph && directory && (
        <GraphViewer
          directory={directory}
          onClose={() => setShowGraph(false)}
        />
      )}
    </div>
  )
}
