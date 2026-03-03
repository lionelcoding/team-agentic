'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Mail, Github, Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { sendMagicLink, signInWithGitHub } from '@/app/auth/actions'

type State = 'idle' | 'loading' | 'success' | 'error'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isPendingGitHub, startGitHubTransition] = useTransition()
  const [isPendingMagic, startMagicTransition] = useTransition()

  const handleMagicLink = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    startMagicTransition(async () => {
      setState('loading')
      const { error } = await sendMagicLink(email.trim())
      if (error) {
        setErrorMsg(error)
        setState('error')
      } else {
        setState('success')
      }
    })
  }

  const handleGitHub = () => {
    startGitHubTransition(async () => {
      const { url, error } = await signInWithGitHub()
      if (error) {
        setErrorMsg(error)
        setState('error')
      } else if (url) {
        router.push(url)
      }
    })
  }

  const isLoading = isPendingMagic || state === 'loading'

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background glow */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-blue-600/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] rounded-full bg-purple-600/4 blur-3xl" />
      </div>

      {/* Card */}
      <div
        className={cn(
          'relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl shadow-black/40',
          'animate-in fade-in slide-in-from-bottom-4 duration-500'
        )}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 shadow-lg shadow-blue-900/40">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-slate-50 tracking-tight">LeadGen B2B</h1>
            <p className="text-sm text-slate-500 mt-1">Multi-Agent Intelligence Platform</p>
          </div>
        </div>

        {/* Success state */}
        {state === 'success' ? (
          <div className="flex flex-col items-center gap-4 py-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <div className="text-center">
              <h2 className="text-base font-semibold text-slate-100 mb-1">
                Vérifiez votre boîte mail !
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Lien envoyé à{' '}
                <span className="font-medium text-blue-400 break-all">{email}</span>
              </p>
              <p className="text-xs text-slate-600 mt-2">
                Le lien expire dans 60 minutes.
              </p>
            </div>
            <button
              onClick={() => { setState('idle'); setEmail('') }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors mt-1 underline underline-offset-2"
            >
              Utiliser une autre adresse
            </button>
          </div>
        ) : (
          <>
            {/* Magic link form */}
            <form onSubmit={handleMagicLink} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-slate-300">
                  Adresse email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@entreprise.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (state === 'error') setState('idle')
                  }}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 focus-visible:ring-blue-500 focus-visible:border-blue-500 h-10"
                />
              </div>

              {/* Error message */}
              {state === 'error' && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-lg animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300 leading-snug">{errorMsg}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full h-10 bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all duration-150 disabled:opacity-50 group"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Envoyer le lien magique
                    <ArrowRight className="w-3.5 h-3.5 ml-2 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-150" />
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-xs text-slate-600 font-medium px-1">ou</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* GitHub OAuth */}
            <Button
              variant="outline"
              onClick={handleGitHub}
              disabled={isPendingGitHub}
              className="w-full h-10 bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100 hover:border-slate-600 transition-all duration-150"
            >
              {isPendingGitHub ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Github className="w-4 h-4 mr-2" />
              )}
              Connexion avec GitHub
            </Button>
          </>
        )}

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-700 mt-8">
          Powered by{' '}
          <span className="text-slate-500 font-medium">Supabase Auth</span>
        </p>
      </div>
    </div>
  )
}
