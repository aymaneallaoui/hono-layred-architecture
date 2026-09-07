import { Input } from '@repo/ui/components/input'
import { Label } from '@repo/ui/components/label'
import { cn } from '@repo/ui/lib/utils'
import { type ComponentProps, useId } from 'react'

interface TextFieldProps extends ComponentProps<typeof Input> {
  label: string
  error?: string
  hint?: string
}

export function TextField({ label, error, hint, className, id, ...props }: TextFieldProps) {
  const generated = useId()
  const fieldId = id ?? generated
  const messageId = `${fieldId}-message`
  return (
    <div className={cn('grid gap-2', className)}>
      <Label htmlFor={fieldId}>{label}</Label>
      <Input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        {...props}
      />
      {error ? (
        <p id={messageId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
