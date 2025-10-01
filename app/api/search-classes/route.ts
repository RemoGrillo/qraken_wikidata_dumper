import { NextRequest, NextResponse } from 'next/server'

interface WikidataSearchResult {
  id: string
  label: string
  description?: string
  match?: {
    text: string
    type: string
    language: string
  }
}

interface WikidataAPIResponse {
  search: WikidataSearchResult[]
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const limit = searchParams.get('limit') || '10'
  
  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    )
  }
  
  try {
    // Use Wikidata's wbsearchentities API
    const url = new URL('https://www.wikidata.org/w/api.php')
    url.searchParams.append('action', 'wbsearchentities')
    url.searchParams.append('search', query)
    url.searchParams.append('language', 'en')
    url.searchParams.append('type', 'item')
    url.searchParams.append('limit', limit)
    url.searchParams.append('format', 'json')
    url.searchParams.append('origin', '*')
    
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'QrakenWikidataDumper/1.0 (https://github.com/RemoGrillo/qraken_wikidata_dumper)'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Wikidata API returned ${response.status}`)
    }
    
    const data: WikidataAPIResponse = await response.json()
    
    // Process and enhance results
    const results = data.search.map(item => ({
      qid: item.id,
      label: item.label || item.id,
      description: item.description || 'No description available',
      // Truncate description for display
      shortDescription: item.description 
        ? item.description.substring(0, 150) + (item.description.length > 150 ? '...' : '')
        : 'No description available'
    }))
    
    // Add some popular classes at the top if they match
    const popularClasses = [
      { qid: 'Q3305213', label: 'painting', description: 'artistic work of visual art that uses paint' },
      { qid: 'Q5', label: 'human', description: 'common name of Homo sapiens' },
      { qid: 'Q571', label: 'book', description: 'medium for recording information in the form of writing or images' },
      { qid: 'Q7889', label: 'video game', description: 'electronic game with user interface and visual feedback' },
      { qid: 'Q11424', label: 'film', description: 'sequence of images that create the illusion of movement' },
      { qid: 'Q215380', label: 'musical group', description: 'group of people who perform music together' },
      { qid: 'Q4167836', label: 'Wikimedia category', description: 'category in Wikimedia projects' },
      { qid: 'Q482994', label: 'album', description: 'collection of music recordings' },
    ]
    
    // Filter popular classes that match the query
    const matchingPopular = popularClasses
      .filter(pc => 
        pc.label.toLowerCase().includes(query.toLowerCase()) ||
        pc.qid.toLowerCase().includes(query.toLowerCase())
      )
      .map(pc => ({
        ...pc,
        shortDescription: pc.description,
        isPopular: true
      }))
    
    // Combine results, avoiding duplicates
    const combinedResults = [
      ...matchingPopular,
      ...results.filter(r => !matchingPopular.find(p => p.qid === r.qid))
    ]
    
    return NextResponse.json({
      results: combinedResults.slice(0, parseInt(limit)),
      query
    })
  } catch (error) {
    console.error('Failed to search Wikidata:', error)
    return NextResponse.json(
      { error: 'Failed to search Wikidata classes' },
      { status: 500 }
    )
  }
}
