import { pixelBasedPreset, type Tailwind } from '@react-email/components'
import type { ComponentProps } from 'react'

export const emailTheme = {
  ink: '#1b1a17',
  ink2: '#5c5955',
  ink3: '#7a7672',
  surface: '#ffffff',
  surface2: '#f3f4f1',
  stroke: '#e1e2dd',
  accent: '#1f4d3a',
  accentEdge: '#173b2d',
  accentInk: '#ffffff',
  fontSans: "system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
  fontMono: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace",
  width: '560px',
} as const

type TailwindConfig = NonNullable<ComponentProps<typeof Tailwind>['config']>

export const emailTailwindConfig: TailwindConfig = {
  presets: [pixelBasedPreset],
  theme: {
    extend: {
      colors: {
        ink: emailTheme.ink,
        'ink-2': emailTheme.ink2,
        'ink-3': emailTheme.ink3,
        surface: emailTheme.surface,
        'surface-2': emailTheme.surface2,
        stroke: emailTheme.stroke,
        accent: emailTheme.accent,
        'accent-edge': emailTheme.accentEdge,
        'accent-ink': emailTheme.accentInk,
      },
      fontFamily: { sans: [emailTheme.fontSans], mono: [emailTheme.fontMono] },
      maxWidth: { email: emailTheme.width },
    },
  },
}
