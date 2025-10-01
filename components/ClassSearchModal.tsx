'use client'

import { useState, useEffect, useRef } from 'react'

interface ClassSearchResult {
  qid: string
  label: string
  description: string
  shortDescription: string
  isPopular?: boolean
}

interface ClassSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (qid: string, label: string) => void
  initialQuery?: string
}

export default function ClassSearchModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  initialQuery = ''
}: ClassSearchModalProps) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<ClassSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
      if (initialQuery) {
        handleSearch(initialQuery)
      }
    }
  }, [isOpen])

  useEffect(() => {
    // Debounced search
    if (query.trim().length > 0) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch(query)
      }, 300)
    } else {
      setResults([])
      setError(null)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query])

  const handleSearch = async (searchQuery: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/search-classes?q=${encodeURIComponent(searchQuery)}&limit=10`
      )

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setResults(data.results || [])
      setSelectedIndex(0)
    } catch (err) {
      setError('Failed to search. Please try again.')
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0)
        break
      case 'Enter':
        e.preventDefault()
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }

  const handleSelect = (result: ClassSearchResult) => {
    onSelect(result.qid, result.label)
    setQuery('')
    setResults([])
    onClose()
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Search Wikidata Classes
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <svg 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type to search (e.g., painting, book, person...)"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="text-red-600 dark:text-red-400 text-center py-4">
              {error}
            </div>
          )}

          {!loading && !error && results.length === 0 && query.trim().length > 0 && (
            <div className="text-gray-500 dark:text-gray-400 text-center py-8">
              No results found for "{query}"
            </div>
          )}

          {!loading && !error && query.trim().length === 0 && (
            <div className="space-y-4">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Popular classes:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { qid: 'Q3305213', label: 'painting' },
                  { qid: 'Q5', label: 'human' },
                  { qid: 'Q571', label: 'book' },
                  { qid: 'Q11424', label: 'film' },
                  { qid: 'Q7889', label: 'video game' },
                  { qid: 'Q482994', label: 'album' },
                ].map(item => (
                  <button
                    key={item.qid}
                    onClick={() => {
                      setQuery(item.label)
                      handleSearch(item.label)
                    }}
                    className="text-left px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-2">
              {results.map((result, index) => (
                <button
                  key={result.qid}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    index === selectedIndex
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {result.label}
                        </h3>
                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                          {result.qid}
                        </span>
                        {result.isPopular && (
                          <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                            Popular
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {result.shortDescription}
                      </p>
                    </div>
                    {index === selectedIndex && (
                      <svg className="w-5 h-5 text-blue-500 mt-1 ml-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Press ↑↓ to navigate, Enter to select, Esc to close
          </p>
        </div>
      </div>
    </div>
  )
}
