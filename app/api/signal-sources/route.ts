import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SOURCE_TYPES = [
  'twitter_handle', 'reddit_subreddit', 'youtube_channel', 'rss_feed',
  'bodacc_filter', 'linkedin_company', 'crunchbase_company', 'custom_api',
] as const

const SUBCATEGORIES = ['knowledge', 'strategy', 'outbound_inbound'] as const

/**
 * GET /api/signal-sources — List all signal sources
 */
export async function GET() {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('signal_sources')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/signal-sources — CRUD multiplexed by action
 * Body: { action: "create" | "update" | "delete" | "toggle", ...fields }
 */
export async function POST(request: NextRequest) {
  const supabase = createClient()

  try {
    const body = await request.json()
    const { action } = body

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 })
    }

    switch (action) {
      case 'create': {
        const { name, source_type, source_identifier, subcategory, enabled } = body

        if (!name || !source_type || !source_identifier || !subcategory) {
          return NextResponse.json(
            { error: 'name, source_type, source_identifier, and subcategory are required' },
            { status: 400 }
          )
        }

        if (!SOURCE_TYPES.includes(source_type)) {
          return NextResponse.json(
            { error: `Invalid source_type. Use one of: ${SOURCE_TYPES.join(', ')}` },
            { status: 400 }
          )
        }

        if (!SUBCATEGORIES.includes(subcategory)) {
          return NextResponse.json(
            { error: `Invalid subcategory. Use one of: ${SUBCATEGORIES.join(', ')}` },
            { status: 400 }
          )
        }

        const { data, error } = await supabase
          .from('signal_sources')
          .insert({
            name,
            source_type,
            source_identifier,
            subcategory,
            enabled: enabled ?? true,
          })
          .select()
          .single()

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data, { status: 201 })
      }

      case 'update': {
        const { id, ...fields } = body
        if (!id) {
          return NextResponse.json({ error: 'id is required for update' }, { status: 400 })
        }

        // Only allow known fields
        const allowed: Record<string, unknown> = {}
        if (fields.name !== undefined) allowed.name = fields.name
        if (fields.source_type !== undefined) {
          if (!SOURCE_TYPES.includes(fields.source_type)) {
            return NextResponse.json(
              { error: `Invalid source_type. Use one of: ${SOURCE_TYPES.join(', ')}` },
              { status: 400 }
            )
          }
          allowed.source_type = fields.source_type
        }
        if (fields.source_identifier !== undefined) allowed.source_identifier = fields.source_identifier
        if (fields.subcategory !== undefined) {
          if (!SUBCATEGORIES.includes(fields.subcategory)) {
            return NextResponse.json(
              { error: `Invalid subcategory. Use one of: ${SUBCATEGORIES.join(', ')}` },
              { status: 400 }
            )
          }
          allowed.subcategory = fields.subcategory
        }
        if (fields.enabled !== undefined) allowed.enabled = fields.enabled

        if (Object.keys(allowed).length === 0) {
          return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
        }

        const { data, error } = await supabase
          .from('signal_sources')
          .update(allowed)
          .eq('id', id)
          .select()
          .single()

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data)
      }

      case 'delete': {
        const { id } = body
        if (!id) {
          return NextResponse.json({ error: 'id is required for delete' }, { status: 400 })
        }

        const { error } = await supabase
          .from('signal_sources')
          .delete()
          .eq('id', id)

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ ok: true })
      }

      case 'toggle': {
        const { id, enabled } = body
        if (!id || typeof enabled !== 'boolean') {
          return NextResponse.json({ error: 'id and enabled (boolean) are required for toggle' }, { status: 400 })
        }

        const { data, error } = await supabase
          .from('signal_sources')
          .update({ enabled })
          .eq('id', id)
          .select()
          .single()

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data)
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Use create, update, delete, or toggle.` },
          { status: 400 }
        )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
