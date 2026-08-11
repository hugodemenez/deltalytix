// app/api/cron/renew-tradovate-token/route.ts
import { prisma } from '@/lib/prisma';
import {
  decryptConnectionToken,
  encryptConnectionToken,
} from '@/lib/connection-token-crypto';
import { NextRequest } from 'next/server';

/**
 * Keeps Tradovate access tokens alive. Scheduled syncing itself lives in
 * /api/cron/daily-sync, which drives every service off the same schedule maths
 * (`lib/connection-sync-schedule.ts`) and reads the token this job refreshes.
 */
export async function GET(request: NextRequest) {
  // Verify this is a cron request
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Get all users with Tradovate tokens from your database
    const synchronizations = await prisma.connection.findMany({
      where: {
        service: 'tradovate',
        token: { not: null }
      }
    });

    // If tokenExpiresAt is null, clear the token (invalid state)
    const missingExpiry = synchronizations.filter((s) => !s.tokenExpiresAt);
    if (missingExpiry.length > 0) {
      console.warn(`[CRON] Clearing ${missingExpiry.length} Tradovate tokens missing tokenExpiresAt`);
      await prisma.connection.updateMany({
        where: {
          id: { in: missingExpiry.map((s) => s.id) }
        },
        data: { token: null, tokenExpiresAt: null }
      });
    }

    const validSynchronizations = synchronizations.filter((s) => !!s.tokenExpiresAt);

    let tokenRenewals = 0;

    const results = await Promise.allSettled(
      validSynchronizations.map((synchronization) => renewUserToken(synchronization))
    );

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        tokenRenewals++;
      }
    });

    return Response.json({
      success: true,
      processed: synchronizations.length,
      tokenRenewals
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return Response.json({ error: 'Cron job failed' }, { status: 500 });
  }
}

/**
 * Attempts to renew the Tradovate access token for a given synchronization record.
 * 
 * - If the current token is valid and renewable, it calls the Tradovate API to renew the access token.
 * - If the renewal is successful, updates the token and its expiration in the database.
 * - If the renewal fails (e.g., token is invalid/expired), clears the token and expiration in the database.
 * 
 * @param synchronization The synchronization record containing user, environment, and token info.
 */
async function renewUserToken(synchronization: any): Promise<boolean> {
  try {
    const apiBaseUrl = synchronization.environment === 'demo' 
      ? 'https://demo.tradovateapi.com' 
      : 'https://live.tradovateapi.com';
    
        const plaintextToken = decryptConnectionToken(synchronization.token)
    if (!plaintextToken) {
      console.error(`[CRON] Missing token for account ${synchronization.externalId}`);
      return false;
    }
    
    console.log(`[CRON] Attempting token renewal for account ${synchronization.externalId}`);
    
    const renewal = await fetch(`${apiBaseUrl}/auth/renewAccessToken`, {
      headers: {
        'Authorization': `Bearer ${plaintextToken}`
      }
    });
    
    if (!renewal.ok) {
      const errorText = await renewal.text();
      console.error(`[CRON] Failed to renew token for account ${synchronization.externalId}: ${errorText}`);
      // Remove invalid/expired token
      await prisma.connection.update({
        where: { id: synchronization.id },
        data: { token: null, tokenExpiresAt: null }
      });
      return false;
    }

    const renewalData = await renewal.json();
    
    // Update database
    await prisma.connection.update({
      where: { id: synchronization.id },
      data: {
        token: encryptConnectionToken(renewalData.accessToken),
        tokenExpiresAt: new Date(renewalData.expirationTime),
      }
    });

    return true;
  } catch (error) {
    console.error(`[CRON] Error renewing token for account ${synchronization.externalId}:`, error);
    // On unexpected error, also expire the token to force re-auth
    await prisma.connection.update({
      where: { id: synchronization.id },
      data: { token: null, tokenExpiresAt: null }
    });
    return false;
  }
}
