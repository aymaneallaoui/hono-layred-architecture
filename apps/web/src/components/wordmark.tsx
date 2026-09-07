import { cn } from '@repo/ui/lib/utils'

export function Wordmark({ className, size = 'sm' }: { className?: string; size?: 'sm' | 'lg' }) {
  return (
    <span
      className={cn(
        'font-display leading-none text-foreground',
        size === 'lg' ? 'text-[clamp(2.75rem,7vw,4.5rem)]' : 'text-[1.35rem]',
        className,
      )}
    >
      Hono <span className="text-primary">Starter</span>
    </span>
  )
}
