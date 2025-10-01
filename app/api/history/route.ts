import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs/promises'
import * as path from 'path'

interface DumpMetadata {
  id: string
  timestamp: string
  config: {
    classQid: string
    radius: number
    maxInstances: number
    language: string
    includeSubclasses: boolean
  }
  status: string
  phase: string
  startTime: string
  endTime?: string
  progress: {
    itemsSeen: number
    triplesWritten: number
  }
  outputFiles?: {
    nt: string
    ttl: string
  }
  error?: string
}

interface DumpHistoryItem {
  directory: string
  metadata: DumpMetadata
  fileSize?: {
    nt?: number
    ttl?: number
  }
}

export async function GET(request: NextRequest) {
  try {
    const dumpsDir = path.join(process.cwd(), 'dumps')
    
    // Check if dumps directory exists
    try {
      await fs.access(dumpsDir)
    } catch {
      // Directory doesn't exist, return empty array
      return NextResponse.json({ dumps: [] })
    }
    
    // Read all directories in dumps folder
    const entries = await fs.readdir(dumpsDir, { withFileTypes: true })
    const directories = entries.filter(entry => entry.isDirectory())
    
    const dumps: DumpHistoryItem[] = []
    
    for (const dir of directories) {
      const dirPath = path.join(dumpsDir, dir.name)
      const metadataPath = path.join(dirPath, 'metadata.json')
      
      try {
        // Read metadata
        const metadataContent = await fs.readFile(metadataPath, 'utf-8')
        const metadata: DumpMetadata = JSON.parse(metadataContent)
        
        // Get file sizes if files exist
        const fileSize: { nt?: number; ttl?: number } = {}
        
        try {
          const ntPath = path.join(dirPath, 'dump.nt')
          const ntStat = await fs.stat(ntPath)
          fileSize.nt = ntStat.size
        } catch {
          // File doesn't exist
        }
        
        try {
          const ttlPath = path.join(dirPath, 'dump.ttl')
          const ttlStat = await fs.stat(ttlPath)
          fileSize.ttl = ttlStat.size
        } catch {
          // File doesn't exist
        }
        
        dumps.push({
          directory: dir.name,
          metadata,
          fileSize,
        })
      } catch (error) {
        console.error(`Failed to read metadata for ${dir.name}:`, error)
        // Skip this directory if metadata is invalid
      }
    }
    
    // Sort by timestamp (newest first)
    dumps.sort((a, b) => {
      const timeA = new Date(a.metadata.timestamp).getTime()
      const timeB = new Date(b.metadata.timestamp).getTime()
      return timeB - timeA
    })
    
    return NextResponse.json({ dumps })
  } catch (error) {
    console.error('Failed to list dump history:', error)
    return NextResponse.json(
      { error: 'Failed to list dump history' },
      { status: 500 }
    )
  }
}

// DELETE endpoint to remove a dump
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const directory = searchParams.get('directory')
  
  if (!directory) {
    return NextResponse.json(
      { error: 'Directory parameter is required' },
      { status: 400 }
    )
  }
  
  try {
    const dumpPath = path.join(process.cwd(), 'dumps', directory)
    
    // Check if directory exists
    await fs.access(dumpPath)
    
    // Remove directory and all contents
    await fs.rm(dumpPath, { recursive: true, force: true })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete dump:', error)
    return NextResponse.json(
      { error: 'Failed to delete dump' },
      { status: 500 }
    )
  }
}
