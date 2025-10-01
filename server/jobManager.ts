import { DumpConfig, DumpJob, DumpProgress } from '@/lib/types'
import { DumpOrchestrator } from './dump'

// Global singleton to persist across API routes
const globalForJobManager = global as unknown as {
  jobManager: JobManager | undefined
}

class JobManager {
  private jobs: Map<string, DumpOrchestrator> = new Map()
  private progressListeners: Map<string, Set<(progress: DumpProgress) => void>> = new Map()

  /**
   * Start a new dump job
   */
  async startJob(config: DumpConfig): Promise<string> {
    const orchestrator = new DumpOrchestrator(config)
    const job = orchestrator.getJob()
    
    this.jobs.set(job.id, orchestrator)
    
    // Set up progress forwarding
    orchestrator.onProgress((progress) => {
      const listeners = this.progressListeners.get(job.id)
      if (listeners) {
        listeners.forEach(listener => listener(progress))
      }
    })
    
    // Execute in background
    orchestrator.execute().catch(error => {
      console.error(`Job ${job.id} failed:`, error)
    })
    
    return job.id
  }

  /**
   * Get job by ID
   */
  getJob(id: string): DumpJob | undefined {
    const orchestrator = this.jobs.get(id)
    return orchestrator?.getJob()
  }

  /**
   * Subscribe to job progress
   */
  subscribeToProgress(jobId: string, callback: (progress: DumpProgress) => void): () => void {
    if (!this.progressListeners.has(jobId)) {
      this.progressListeners.set(jobId, new Set())
    }
    
    this.progressListeners.get(jobId)!.add(callback)
    
    // Return unsubscribe function
    return () => {
      const listeners = this.progressListeners.get(jobId)
      if (listeners) {
        listeners.delete(callback)
        if (listeners.size === 0) {
          this.progressListeners.delete(jobId)
        }
      }
    }
  }

  /**
   * Abort a job
   */
  abortJob(id: string): boolean {
    const orchestrator = this.jobs.get(id)
    if (orchestrator) {
      orchestrator.abort()
      return true
    }
    return false
  }

  /**
   * Clean up completed jobs (optional, for memory management)
   */
  cleanupCompletedJobs(olderThanMs: number = 3600000): void {
    const now = Date.now()
    
    this.jobs.forEach((orchestrator, id) => {
      const job = orchestrator.getJob()
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.endTime &&
        now - job.endTime.getTime() > olderThanMs
      ) {
        this.jobs.delete(id)
        this.progressListeners.delete(id)
      }
    })
  }

  /**
   * Get all jobs
   */
  getAllJobs(): DumpJob[] {
    return Array.from(this.jobs.values()).map(o => o.getJob())
  }
}

// Singleton instance - persist across hot reloads in development
export const jobManager = globalForJobManager.jobManager ?? new JobManager()

if (process.env.NODE_ENV !== 'production') {
  globalForJobManager.jobManager = jobManager
}
