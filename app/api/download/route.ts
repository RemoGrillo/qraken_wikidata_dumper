import { NextRequest, NextResponse } from 'next/server'
import { jobManager } from '@/server/jobManager'
import * as fs from 'fs/promises'
import * as path from 'path'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')
  const format = searchParams.get('format') || 'nt'
  
  if (!id) {
    return NextResponse.json(
      { error: 'ID is required' },
      { status: 400 }
    )
  }
  
  if (format !== 'nt' && format !== 'ttl') {
    return NextResponse.json(
      { error: 'Invalid format. Use "nt" or "ttl"' },
      { status: 400 }
    )
  }
  
  let filePath: string | undefined
  let classQid = 'data'
  let radius = 1
  
  // First, try to get from jobManager (for active/recent jobs)
  const job = jobManager.getJob(id)
  if (job) {
    // Job found in memory
    if (job.status !== 'completed') {
      return NextResponse.json(
        { error: 'Job is not completed yet', status: job.status },
        { status: 400 }
      )
    }
    
    filePath = format === 'nt' ? job.outputFiles?.nt : job.outputFiles?.ttl
    classQid = job.config.classQid
    radius = job.config.radius
  } else {
    // Not in memory, treat as directory name for historical dumps
    const directory = id
    
    // Check if it looks like a timestamp directory (e.g., 2025-10-01T12-17-42_Q3305213)
    if (directory.includes('_')) {
      // Extract classQid from directory name if possible
      const parts = directory.split('_')
      if (parts.length > 1) {
        classQid = parts[1]
      }
    }
    
    // Build file path directly
    const dumpsDir = path.join(process.cwd(), 'dumps', directory)
    const fileName = format === 'nt' ? 'dump.nt' : 'dump.ttl'
    filePath = path.join(dumpsDir, fileName)
    
    // Try to read metadata for better filename
    try {
      const metadataPath = path.join(dumpsDir, 'metadata.json')
      const metadataContent = await fs.readFile(metadataPath, 'utf-8')
      const metadata = JSON.parse(metadataContent)
      if (metadata.config) {
        classQid = metadata.config.classQid || classQid
        radius = metadata.config.radius || radius
      }
    } catch {
      // Metadata not available, use defaults
    }
  }
  
  if (!filePath) {
    return NextResponse.json(
      { error: 'Output file not found' },
      { status: 404 }
    )
  }
  
  try {
    // Check if file exists
    await fs.access(filePath)
    
    // Read file
    const fileContent = await fs.readFile(filePath)
    
    // Determine content type
    const contentType = format === 'nt' 
      ? 'application/n-triples' 
      : 'text/turtle'
    
    // Generate filename
    const filename = `wikidata-${classQid}-r${radius}.${format}`
    
    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(fileContent)
    
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileContent.length.toString(),
      },
    })
  } catch (error) {
    console.error('Failed to read file:', error)
    return NextResponse.json(
      { error: 'Failed to read output file' },
      { status: 500 }
    )
  }
}
