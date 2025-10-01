import { NextRequest, NextResponse } from 'next/server'
import { jobManager } from '@/server/jobManager'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const jobId = searchParams.get('id')
  
  if (!jobId) {
    return NextResponse.json(
      { error: 'Job ID is required' },
      { status: 400 }
    )
  }
  
  // Check if job exists
  const job = jobManager.getJob(jobId)
  if (!job) {
    return NextResponse.json(
      { error: 'Job not found' },
      { status: 404 }
    )
  }
  
  // Create a readable stream for SSE
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      // Send initial job state
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(job.progress)}\n\n`)
      )
      
      // Subscribe to progress updates
      const unsubscribe = jobManager.subscribeToProgress(jobId, (progress) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(progress)}\n\n`)
          )
          
          // Close stream when job is completed
          if (progress.phase === 'completed') {
            controller.enqueue(encoder.encode('event: complete\ndata: done\n\n'))
            controller.close()
            unsubscribe()
          }
        } catch (error) {
          console.error('Error sending progress:', error)
          controller.error(error)
        }
      })
      
      // Clean up on client disconnect
      request.signal.addEventListener('abort', () => {
        unsubscribe()
        controller.close()
      })
    },
  })
  
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
