import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CopyNotificationProps {
  show: boolean
  message: string
}

export function CopyNotification({ show, message }: CopyNotificationProps) {
  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-200',
      show ? 'opacity-100' : 'opacity-0 pointer-events-none'
    )}>
      <div className={cn(
        'bg-zinc-800/90 backdrop-blur-xs text-white px-6 py-4 rounded-xl shadow-lg transform transition-all duration-200 flex flex-col items-center gap-2',
        show ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
      )}>
        <div className="bg-white/10 rounded-full p-2">
          <Check className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  )
} 