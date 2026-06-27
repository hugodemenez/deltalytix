'use server'

import SupportRequestEmail from '@/components/emails/support-request';
import SubscriptionErrorEmail from '@/components/emails/support-subscription-error';
import { getSupportEmailConfig, getSupportFromAddress } from '@/lib/resend-from';
import { Resend } from 'resend';
import { createElement } from 'react';

interface SupportEmailData {
  messages: { role: string; content: string }[];
  summary: string;
  contactInfo: {
    name: string,
    email: string;
    additionalInfo: string;
    locale: 'en' | 'fr';
  };
}

export async function sendSupportEmail({ messages, summary, contactInfo }: SupportEmailData) {
  const config = getSupportEmailConfig();
  if (!config.ok) {
    console.error('Support email misconfigured:', config.error);
    return { success: false, error: 'Failed to send support request' };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: config.from,
      to: [config.to],
      cc: [contactInfo.email],
      replyTo: contactInfo.email,
      subject: contactInfo.locale === 'fr' ? 'Nouvelle demande de support' : 'New Support Request',
      react: createElement(SupportRequestEmail, { locale: contactInfo.locale, messages, contactInfo, summary }),
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error: 'Failed to send support request' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

interface SubscriptionErrorEmailData {
  contactInfo: {
    email: string;
    additionalInfo: string;
  };
}

export async function sendSubscriptionErrorEmail({ contactInfo }: SubscriptionErrorEmailData) {
  const config = getSupportEmailConfig();
  if (!config.ok) {
    console.error('Support email misconfigured:', config.error);
    return { success: false, error: 'Failed to send support request' };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: getSupportFromAddress(),
      to: [config.to],
      replyTo: contactInfo.email,
      subject: 'Error creating subscription',
      react: createElement(SubscriptionErrorEmail, { contactInfo }),
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error: 'Failed to send support request' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
