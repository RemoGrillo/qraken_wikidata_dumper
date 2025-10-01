'use client'

import { useState } from 'react'
import { DumpConfig } from '@/lib/types'
import ClassSearchModal from './ClassSearchModal'

interface DumpFormProps {
  onSubmit: (config: DumpConfig) => void
}

export default function DumpForm({ onSubmit }: DumpFormProps) {
  const [config, setConfig] = useState<DumpConfig>({
    classQid: 'Q3305213', // Default: painting
    radius: 4,
    maxInstances: 1,
    language: 'en',
    includeSubclasses: true,
    includePropertyMetadata: true, // Default to true for better dumps
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [selectedClassLabel, setSelectedClassLabel] = useState<string>('painting')
  const [searchQuery, setSearchQuery] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      await onSubmit(config)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClassSelect = (qid: string, label: string) => {
    setConfig({ ...config, classQid: qid })
    setSelectedClassLabel(label)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      setIsSearchOpen(true)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="classSearch" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Class
          </label>
          <div className="relative">
            <input
              type="text"
              id="classSearch"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search for a class (e.g., painting, book, person...)"
              className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
          
          {config.classQid && (
            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Selected: {selectedClassLabel}
                  </span>
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    ({config.classQid})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setIsSearchOpen(true)
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Change
                </button>
              </div>
            </div>
          )}
          
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Select a Wikidata class to create a dump for
          </p>
        </div>

      <div>
        <label htmlFor="radius" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Radius
        </label>
        <select
          id="radius"
          value={config.radius}
          onChange={(e) => {
            const value = parseInt(e.target.value)
            setConfig({ ...config, radius: isNaN(value) ? 2 : value })
          }}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        >
          <option value={1}>1 (Direct properties of instances)</option>
          <option value={2}>2 (Properties of direct neighbors)</option>
          <option value={3}>3 (Properties of 2-hop neighbors)</option>
          <option value={4}>4 (Properties of 3-hop neighbors)</option>
          <option value={5}>5 (Properties of 4-hop neighbors)</option>
        </select>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          How many hops from the instances to explore. Each radius fetches properties FROM entities, not instances OF classes.
        </p>
      </div>

      <div>
        <label htmlFor="maxInstances" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Maximum Instances
        </label>
        <input
          type="number"
          id="maxInstances"
          value={config.maxInstances}
          onChange={(e) => {
            const value = parseInt(e.target.value)
            setConfig({ ...config, maxInstances: isNaN(value) ? 1 : value })
          }}
          min={1}
          max={100000}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Maximum number of instances to include (1-100,000)
        </p>
      </div>

      <div>
        <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Language
        </label>
        <input
          type="text"
          id="language"
          value={config.language}
          onChange={(e) => setConfig({ ...config, language: e.target.value })}
          pattern="[a-z]{2,10}"
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          placeholder="en"
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Language code for labels (e.g., en, fr, de, es)
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={config.includeSubclasses}
              onChange={(e) => setConfig({ ...config, includeSubclasses: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Include subclasses
            </span>
          </label>
          <p className="mt-1 ml-7 text-sm text-gray-500 dark:text-gray-400">
            Expand the class to include all its subclasses (uses P279*)
          </p>
        </div>
        
        <div>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={config.includePropertyMetadata !== false}
              onChange={(e) => setConfig({ ...config, includePropertyMetadata: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Include property metadata
            </span>
          </label>
          <p className="mt-1 ml-7 text-sm text-gray-500 dark:text-gray-400">
            Fetch human-readable labels and descriptions for properties (e.g., P31 → "instance of")
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Starting...' : 'Start Dump'}
      </button>
    </form>
    
    <ClassSearchModal
      isOpen={isSearchOpen}
      onClose={() => setIsSearchOpen(false)}
      onSelect={handleClassSelect}
      initialQuery={searchQuery}
    />
  </>
  )
}
