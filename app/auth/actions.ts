'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

export async function sendMagicLink(email: string): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()
    const redirectUrl =
      process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL ||
      `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback`

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    })

    if (error) return { error: error.message }
    return { error: null }
  } catch {
    return { error: 'Une erreur inattendue est survenue. Veuillez réessayer.' }
  }
}

export async function signInWithGitHub(): Promise<{ url: string | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const redirectUrl =
      process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL ||
      `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback`

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: redirectUrl,
      },
    })

    if (error) return { url: null, error: error.message }
    return { url: data.url, error: null }
  } catch {
    return { url: null, error: 'Une erreur inattendue est survenue. Veuillez réessayer.' }
  }
}
