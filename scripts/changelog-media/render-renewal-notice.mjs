#!/usr/bin/env bun
/**
 * Render the locked Paper account-payment notice to HTML.
 * Run with Bun so `@/` and the TSX template resolve.
 *
 *   bun scripts/changelog-media/render-renewal-notice.mjs en
 */
import { render } from '@react-email/render'
import RenewalNoticeEmail from '../../components/emails/renewal-notice.tsx'

/** Locked Paper sample from `components/emails/renewal-notice.test.tsx`. */
const PAPER_PROPS = {
  userFirstName: 'Hugo',
  userEmail: 'hugo@example.com',
  accountName: 'LOCAL-SIM-001',
  propFirmName: 'Apex',
  nextPaymentDate: '2026-09-12',
  daysUntilRenewal: 7,
  paymentFrequency: 'monthly',
  unsubscribeUrl: 'https://www.deltalytix.app/settings/notifications',
  changeReminderUrl: 'https://www.deltalytix.app/dashboard',
  turnOffNoticeUrl: 'https://www.deltalytix.app/dashboard',
  now: '2026-09-05',
}

const locale = process.argv[2] === 'fr' ? 'fr' : 'en'
const html = await render(
  RenewalNoticeEmail({
    ...PAPER_PROPS,
    language: locale,
  }),
)
process.stdout.write(html)
