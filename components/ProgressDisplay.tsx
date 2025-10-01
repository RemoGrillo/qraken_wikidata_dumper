'use client'

import { useEffect, useState } from 'react'
import { DumpProgress } from '@/lib/types'

interface ProgressDisplayProps {
  jobId: string
  onComplete?: () => void
}

export default function ProgressDisplay({ jobId, onComplete }: ProgressDisplayProps) {
  const [progress, setProgress] = useState<DumpProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const eventSource = new EventSource(`/api/progress?id=${jobId}`)
    
    eventSource.onmessage = (event) => {
      try {
        const data: DumpProgress = JSON.parse(event.data)
        setProgress(data)
        
        if (data.phase === 'completed') {
          eventSource.close()
          onComplete?.()
        }
      } catch (err) {
        console.error('Failed to parse progress:', err)
      }
    }
    
    eventSource.addEventListener('complete', () => {
      eventSource.close()
      onComplete?.()
    })
    
    eventSource.onerror = (err) => {
      console.error('EventSource error:', err)
      setError('Connection lost. Please refresh the page.')
      eventSource.close()
    }
    
    return () => {
      eventSource.close()
    }
  }, [jobId, onComplete])

  const getPhaseLabel = (phase: string): string => {
    const labels: Record<string, string> = {
      'initializing': 'Initializing',
      'expanding-subclasses': 'Expanding Subclasses',
      'enumerating-instances': 'Enumerating Instances',
      'estimating-triples': 'Estimating Triples',
      'fetching-r1': 'Fetching Radius 1 Data',
      'fetching-r2': 'Fetching Radius 2 Data',
      'enriching-properties': 'Enriching Property Metadata',
      'converting-ttl': 'Converting to Turtle',
      'completed': 'Completed',
    }
    return labels[phase] || phase
  }

  const getProgressPercentage = (): number => {
    if (!progress) return 0
    
    // For completed phase, always return 100
    if (progress.phase === 'completed') return 100
    
    // During fetching phases, use items or triples
    if (progress.phase === 'fetching-r1' || progress.phase === 'fetching-r2') {
      if (progress.estimatedTriples && progress.triplesWritten) {
        // Cap at 99% until actually completed
        return Math.min(99, Math.round((progress.triplesWritten / progress.estimatedTriples) * 100))
      }
    }
    
    // For other phases, use items seen
    if (progress.totalItems && progress.itemsSeen) {
      return Math.min(99, Math.round((progress.itemsSeen / progress.totalItems) * 100))
    }
    
    // Default progress based on phase
    const phaseProgress: Record<string, number> = {
      'initializing': 5,
      'expanding-subclasses': 10,
      'enumerating-instances': 20,
      'estimating-triples': 30,
      'fetching-r1': 50,
      'fetching-r2': 70,
      'enriching-properties': 85,
      'converting-ttl': 95,
      'completed': 100,
    }
    
    return phaseProgress[progress.phase] || 0
  }

  if (error) {
    return (
      <div className="text-red-600 dark:text-red-400">
        <p>{error}</p>
      </div>
    )
  }

  if (!progress) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Connecting...</span>
      </div>
    )
  }

  const percentage = getProgressPercentage()

  return (
    <div className="space-y-6">
      {/* Phase Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            {progress.phase !== 'completed' && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getPhaseLabel(progress.phase)}
            </h3>
            {progress.message && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {progress.message}
              </p>
            )}
          </div>
        </div>
        {progress.eta && progress.phase !== 'completed' && (
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">Estimated time</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{progress.eta}</p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Progress</span>
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{percentage}%</span>
        </div>
        <div className="relative">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
              style={{ width: `${percentage}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
          {percentage > 0 && percentage < 100 && (
            <div 
              className="absolute top-0 h-3 w-1 bg-white/50 animate-pulse"
              style={{ left: `${percentage}%`, marginLeft: '-2px' }}
            />
          )}
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-4 border border-blue-200/50 dark:border-blue-700/50">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Items</p>
              <svg className="w-4 h-4 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {progress.itemsSeen.toLocaleString()}
            </p>
            {progress.totalItems && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                of {progress.totalItems.toLocaleString()} total
              </p>
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-blue-200 dark:bg-blue-700 rounded-full opacity-20"></div>
        </div>
        
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-4 border border-purple-200/50 dark:border-purple-700/50">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">Triples</p>
              <svg className="w-4 h-4 text-purple-500 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {progress.triplesWritten.toLocaleString()}
            </p>
            {progress.estimatedTriples && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                ~{progress.estimatedTriples.toLocaleString()} estimated
              </p>
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-purple-200 dark:bg-purple-700 rounded-full opacity-20"></div>
        </div>
      </div>

      {/* Processing Indicator */}
      {progress.phase !== 'completed' && (
        <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <div className="absolute inset-0 animate-ping rounded-full h-8 w-8 border border-blue-400 opacity-20"></div>
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Processing your request...
            </span>
          </div>
        </div>
      )}

      {/* Completed Indicator */}
      {progress.phase === 'completed' && (
        <div className="flex items-center justify-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
          <div className="flex items-center space-x-3">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              Dump completed successfully!
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
