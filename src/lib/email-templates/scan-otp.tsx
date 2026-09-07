import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

import type { TemplateEntry } from './registry'

interface Props {
  code?: string
  lang?: 'ar' | 'en'
  name?: string | null
}

const copy = {
  ar: {
    intro: 'استخدم الرمز التالي لتأكيد رقم جوالك والدخول إلى اشتراكك.',
    expiry: 'الرمز صالح لمدة 10 دقائق.',
    warning: 'لا تشارك هذا الرمز مع أي شخص. إذا لم تطلبه، تجاهل هذه الرسالة.',
    heading: 'رمز التحقق',
    greeting: (name?: string | null) => (name ? `مرحبًا ${name}،` : 'مرحبًا،'),
  },
  en: {
    intro: 'Use the code below to confirm your phone number and open your subscription.',
    expiry: 'This code expires in 10 minutes.',
    warning: "Never share this code with anyone. If you didn't request it, ignore this email.",
    heading: 'Verification code',
    greeting: (name?: string | null) => (name ? `Hi ${name},` : 'Hi there,'),
  },
} as const

const Email = ({ code = '------', lang = 'ar', name = null }: Props) => {
  const isAr = lang === 'ar'
  const t = copy[isAr ? 'ar' : 'en']

  return (
    <Html lang={isAr ? 'ar' : 'en'} dir={isAr ? 'rtl' : 'ltr'}>
      <Head />
      <Preview>{`KOB — ${t.heading}: ${code}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>KOB</Text>
          <Section style={card}>
            <Heading style={heading}>{t.heading}</Heading>
            <Text style={paragraph}>{t.greeting(name)}</Text>
            <Text style={paragraph}>{t.intro}</Text>
            <Text style={codeBox}>{code}</Text>
            <Text style={muted}>{t.expiry}</Text>
            <Text style={small}>{t.warning}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    data['lang'] === 'en'
      ? `Your verification code: ${data['code'] ?? ''}`
      : `رمز التحقق: ${data['code'] ?? ''}`,
  displayName: 'Scan verification code',
  previewData: { code: '482913', lang: 'ar', name: 'باسم' },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Arial, Helvetica, sans-serif',
  color: '#2b1b12',
}
const container = { maxWidth: '520px', margin: '0 auto', padding: '32px 24px' }
const brand = {
  textAlign: 'center' as const,
  fontSize: '20px',
  fontWeight: 700,
  letterSpacing: '2px',
  color: '#b8823c',
  margin: '0',
}
const card = {
  marginTop: '24px',
  border: '1px solid #eee1d2',
  borderRadius: '16px',
  padding: '28px 24px',
}
const heading = { fontSize: '18px', margin: '0 0 16px', color: '#2b1b12' }
const paragraph = { fontSize: '14px', lineHeight: '1.7', color: '#5b4636', margin: '0 0 12px' }
const codeBox = {
  textAlign: 'center' as const,
  margin: '24px 0',
  padding: '14px 26px',
  borderRadius: '12px',
  backgroundColor: '#2b1b12',
  color: '#f4c77b',
  fontSize: '30px',
  letterSpacing: '10px',
  fontWeight: 700,
  direction: 'ltr' as const,
}
const muted = { fontSize: '13px', color: '#5b4636', margin: '0 0 8px' }
const small = { fontSize: '12px', color: '#8a7565', margin: '0' }
