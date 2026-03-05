import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/signals — List signals with optional filters
 * Query params: subcategory, status, impact_level, limit
 */
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)

  const subcategory = searchParams.get('subcategory')
  const status = searchParams.get('status')
  const impactLevel = searchParams.get('impact_level')
  const limit = parseInt(searchParams.get('limit') || '100', 10)

  try {
    let query = supabase
      .from('signal_items')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (subcategory) query = query.eq('subcategory', subcategory)
    if (status) query = query.eq('status', status)
    if (impactLevel) query = query.eq('impact_level', impactLevel)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
