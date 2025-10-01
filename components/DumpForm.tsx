'use client'

import { useState } from 'react'
import { DumpConfig } from '@/lib/types'

interface DumpFormProps {
  onSubmit: (config: DumpConfig) => void
}

export default function DumpForm({ onSubmit }: DumpFormProps) {
  const [config, setConfig] = useState<DumpConfig>({
    classQid: 'Q3305213', // Default: painting
    radius: 2,
    maxInstances: 1000,
    language: 'en',
    includeSubclasses: true,
    includePropertyMetadata: true, // Default to true for better dumps
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      await onSubmit(config)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="classQid" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Class QID
        </label>
        <input
          type="text"
          id="classQid"
          value={config.classQid}
          onChange={(e) => setConfig({ ...config, classQid: e.target.value })}
          pattern="Q\d+"
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          placeholder="e.g., Q3305213 (painting)"
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          The Wikidata QID of the class to dump (e.g., Q3305213 for painting)
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
          <option value={1}>1 (Direct properties only)</option>
          <option value={2}>2 (Include neighbor properties)</option>
          <option value={3}>3 (Two hops from instances)</option>
        </select>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          How many hops from the instances to include in the dump
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
  )
}
