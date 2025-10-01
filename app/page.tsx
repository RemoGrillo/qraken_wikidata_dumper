'use client'

import { useState } from 'react'
import DumpForm from '@/components/DumpForm'
import ProgressDisplay from '@/components/ProgressDisplay'
import DownloadLinks from '@/components/DownloadLinks'
import { DumpConfig } from '@/lib/types'

export default function Home() {
  const [jobId, setJobId] = useState<string | null>(null)
  const [isCompleted, setIsCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStartDump = async (config: DumpConfig) => {
    setError(null)
    setIsCompleted(false)
    
    try {
      const response = await fetch('/api/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to start dump')
      }
      
      const data = await response.json()
      setJobId(data.jobId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const handleComplete = () => {
    setIsCompleted(true)
  }

  const handleReset = () => {
    setJobId(null)
    setIsCompleted(false)
    setError(null)
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse-slow" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <header className="mb-12 animate-slide-in">
            <div className="flex items-center justify-between mb-8">
              <div className="flex-1">
                <div className="inline-flex items-center justify-center p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                  Wikidata Radius Dumper
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl">
                  Extract RDF data from Wikidata with configurable radius-based crawling. 
                  Safe, efficient, and respects all API limits.
                </p>
              </div>
              <div className="ml-8">
                <a
                  href="/history"
                  className="inline-flex items-center px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">View History</span>
                </a>
              </div>
            </div>
          </header>

          {/* Error Alert */}
          {error && (
            <div className="mb-8 animate-slide-in">
              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg p-4 shadow-sm">
                <div className="flex">
                  <svg className="h-5 w-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="ml-3 text-red-800 dark:text-red-200">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Card */}
          <div className="animate-slide-in" style={{ animationDelay: '0.1s' }}>
            {!jobId && (
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Configure Your Dump</h2>
                  <p className="text-gray-600 dark:text-gray-400">Set up parameters for your Wikidata extraction</p>
                </div>
                <DumpForm onSubmit={handleStartDump} />
              </div>
            )}

            {jobId && !isCompleted && (
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Processing Dump</h2>
                  <p className="text-gray-600 dark:text-gray-400">Your extraction is in progress</p>
                </div>
                <ProgressDisplay jobId={jobId} onComplete={handleComplete} />
              </div>
            )}

            {jobId && isCompleted && (
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8">
                <DownloadLinks jobId={jobId} />
                <button
                  onClick={handleReset}
                  className="mt-6 w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg"
                >
                  Start New Dump
                </button>
              </div>
            )}
          </div>

          {/* Features Grid */}
          {!jobId && (
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-in" style={{ animationDelay: '0.2s' }}>
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Safe & Compliant</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Respects all Wikidata API limits with proper User-Agent headers and rate limiting</p>
              </div>

              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Efficient Crawling</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Uses MediaWiki API for enumeration, avoiding expensive SPARQL pagination</p>
              </div>

              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Multiple Formats</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Export to N-Triples (.nt) and Turtle (.ttl) formats with full label support</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="mt-16 text-center animate-slide-in" style={{ animationDelay: '0.3s' }}>
            <div className="inline-flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>Built with respect for Wikidata Query Service policies</span>
            </div>
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              Efficient instance enumeration • Safe rate limiting • Streaming exports
            </p>
          </footer>
        </div>
      </div>
    </main>
  )
}
