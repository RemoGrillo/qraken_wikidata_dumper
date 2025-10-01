export interface DumpConfig {
  classQid: string
  radius: number
  maxInstances: number
  language: string
  includeSubclasses: boolean
  includePropertyMetadata?: boolean
}

export interface DumpJob {
  id: string
  config: DumpConfig
  status: 'pending' | 'running' | 'completed' | 'failed'
  phase: DumpPhase
  progress: DumpProgress
  startTime: Date
  endTime?: Date
  error?: string
  outputFiles?: {
    nt?: string
    ttl?: string
  }
}

export type DumpPhase = 
  | 'initializing' 
  | 'expanding-subclasses' 
  | 'enumerating-instances' 
  | 'estimating-triples' 
  | 'fetching-r1' 
  | 'fetching-r2'
  | 'enriching-properties' 
  | 'converting-ttl' 
  | 'completed'

export interface DumpProgress {
  phase: DumpPhase
  itemsSeen: number
  totalItems?: number
  triplesWritten: number
  estimatedTriples?: number
  eta?: string
  message?: string
}

export interface WikidataInstance {
  qid: string
  label?: string
}

export interface SearchResult {
  ids: string[]
  totalHits: number
  continueToken?: string
}

export interface SparqlResponse {
  head: {
    vars: string[]
  }
  results: {
    bindings: Array<{
      [key: string]: {
        type: string
        value: string
        'xml:lang'?: string
        datatype?: string
      }
    }>
  }
}

export interface ConstructResponse {
  triples: string // N-Triples format
  neighbors: Set<string> // QIDs of neighbor entities
}
