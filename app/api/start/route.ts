import { NextRequest, NextResponse } from 'next/server'
import { startJobSchema } from '@/lib/schemas'
import { jobManager } from '@/server/jobManager'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const result = startJobSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.issues },
        { status: 400 }
      )
    }
    
    // Start the job
    const jobId = await jobManager.startJob(result.data.config)
    
    return NextResponse.json({ jobId })
  } catch (error) {
    console.error('Failed to start job:', error)
    return NextResponse.json(
      { error: 'Failed to start job' },
      { status: 500 }
    )
  }
}
