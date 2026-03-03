import { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface PagePlaceholderProps {
  icon: LucideIcon
  title: string
  description: string
  color?: string
}

export function PagePlaceholder({
  icon: Icon,
  title,
  description,
  color = 'text-blue-400',
}: PagePlaceholderProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`w-4 h-4 ${color}`} />
          <h1 className="text-lg font-semibold text-slate-100">{title}</h1>
        </div>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <Card className="bg-slate-900 border-slate-800 border-dashed p-12 flex flex-col items-center justify-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center">
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-300">{title}</p>
          <p className="text-xs text-slate-600 mt-1">Cette page sera implémentée dans la prochaine étape.</p>
        </div>
      </Card>
    </div>
  )
}
