import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components'
import type { ReactNode } from 'react'

import { emailTailwindConfig } from '@/emails/theme'

const APP_NAME = process.env.APP_NAME ?? 'Hono Starter'

export function EmailLayout({ preview, children }: { preview: string; children: ReactNode }) {
  return (
    <Html lang="en">
      <Tailwind config={emailTailwindConfig}>
        <Head />
        <Body className="m-0 bg-surface-2 py-[32px] font-sans">
          <Preview>{preview}</Preview>
          <Container className="mx-auto max-w-email px-[24px]">
            <Section className="pb-[20px]">
              <Text className="m-0 text-[13px] font-bold tracking-[0.08em] text-ink uppercase">
                {APP_NAME}
              </Text>
            </Section>
            <Section className="rounded-[10px] border border-solid border-stroke bg-surface p-[32px]">
              {children}
            </Section>
            <Section className="pt-[20px]">
              <Text className="m-0 text-[12px] leading-[18px] text-ink-3">
                You received this email because of activity on your {APP_NAME} account.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export function EmailHeading({ children }: { children: ReactNode }) {
  return (
    <Heading as="h1" className="m-0 mb-[20px] text-[24px] leading-[30px] font-semibold text-ink">
      {children}
    </Heading>
  )
}

export function Paragraph({ children }: { children: ReactNode }) {
  return <Text className="my-[16px] text-[16px] leading-[26px] text-ink-2">{children}</Text>
}

export function ActionButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Section className="my-[28px]">
      <Button
        href={href}
        className="box-border rounded-[6px] border border-solid border-accent-edge bg-accent px-[22px] py-[12px] text-[15px] font-semibold text-accent-ink no-underline"
      >
        {children}
      </Button>
    </Section>
  )
}

export function LinkFallback({ href }: { href: string }) {
  return (
    <>
      <Text className="mt-[20px] mb-[6px] text-[13px] leading-[20px] text-ink-3">
        Or paste this link into your browser:
      </Text>
      <Link href={href} className="font-mono text-[13px] break-all text-accent">
        {href}
      </Link>
    </>
  )
}

export function Footnote({ children }: { children: ReactNode }) {
  return (
    <>
      <Hr className="my-[28px] border-solid border-stroke" />
      <Text className="m-0 text-[13px] leading-[20px] text-ink-3">{children}</Text>
    </>
  )
}
