// app/actions/sendSupportEmail.ts
'use server'

import SupportRequestEmail from '@/components/emails/support-request';
import SubscriptionErrorEmail from '@/components/emails/support-subscription-error';
import { Resend } from 'resend';
import { createElement } from 'react';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SupportEmailData {
  messages: { role: string; content: string }[];
  contactInfo: {
    name: string,
    email: string;
    additionalInfo: string;
  };
}

export async function sendSupportEmail({ messages, contactInfo }: SupportEmailData) {
  try {
    const { data, error } = await resend.emails.send({
      from: `Deltalytix Support <${process.env.SUPPORT_EMAIL??''}>`,
      to: [process.env.SUPPORT_TEAM_EMAIL??''],
      subject: 'New Support Request',
      react: createElement(SupportRequestEmail, { messages, contactInfo }),
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
  try {
    const { data, error } = await resend.emails.send({
      from: `Deltalytix Support <${process.env.SUPPORT_EMAIL??''}>`,
      to: [process.env.SUPPORT_TEAM_EMAIL??''],
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