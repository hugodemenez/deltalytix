// app/api/cron/renew-tradovate-token/route.ts
import { prisma } from '@/lib/prisma';
import {
  decryptConnectionToken,
  encryptConnectionToken,
} from '@/lib/connection-token-crypto';
import {
  hostsAfterAuthResponse,
  normalizeTradovateEnvironment,
  parseTradovateApiHosts,
  tradovateTradingRestBaseUrl,
  withTradovateHost,
} from '@/lib/tradovate/api-hosts';
import { tradovateFetch } from '@/lib/tradovate/fetch';
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
async function renewUserToken(synchronization: {
  id: string
  externalId: string
  environment: string
  token: string | null
  apiHosts?: unknown
}): Promise<boolean> {
  try {
    const environment = normalizeTradovateEnvironment(synchronization.environment)
    const storedHosts = parseTradovateApiHosts(synchronization.apiHosts)
    const apiBaseUrl = tradovateTradingRestBaseUrl({
      environment,
      apiHosts: storedHosts,
    })

    const plaintextToken = decryptConnectionToken(synchronization.token)
    if (!plaintextToken) {
      console.error(`[CRON] Missing token for account ${synchronization.externalId}`);
      return false;
    }
    
    console.log(`[CRON] Attempting token renewal for account ${synchronization.externalId}`);
    
    // A connection stored before the changeover has no `apiHosts`, so this
    // first call still goes to the shared host and may be redirected. Capture
    // where it lands so the next run goes straight there.
    const redirected: { host: string | null } = { host: null }
    const renewal = await tradovateFetch(
      `${apiBaseUrl}/auth/renewAccessToken`,
      { headers: { 'Authorization': `Bearer ${plaintextToken}` } },
      {
        label: 'renewAccessToken',
        onHostRedirect: (host) => { redirected.host = host },
      },
    );

    if (!renewal.ok) {
      const errorText = await renewal.text();
      console.error(`[CRON] Failed to renew token for account ${synchronization.externalId} (${renewal.status}): ${errorText}`);
      // Only an outright rejection means the token is dead. Clearing it on a
      // 5xx, a timeout or an unfollowable redirect would disconnect the user
      // over a transient failure and force a full re-auth; leave it for the
      // next run instead.
      if (renewal.status !== 401 && renewal.status !== 403) {
        return false;
      }
      await prisma.connection.update({
        where: { id: synchronization.id },
        data: { token: null, tokenExpiresAt: null }
      });
      return false;
    }

    const renewalData = await renewal.json();
    // Hosts named in the body win; the redirect target fills in what it omits.
    const discoveredHosts = redirected.host
      ? withTradovateHost(storedHosts, 'trading', environment, redirected.host)
      : storedHosts
    const nextHosts = hostsAfterAuthResponse(discoveredHosts, renewalData)
    
    // Update database
    await prisma.connection.update({
      where: { id: synchronization.id },
      data: {
        token: encryptConnectionToken(renewalData.accessToken),
        tokenExpiresAt: new Date(renewalData.expirationTime),
        ...(nextHosts ? { apiHosts: nextHosts } : {}),
      }
    });

    return true;
  } catch (error) {
    // Network failures and DB hiccups say nothing about the token's validity,
    // so keep it and retry on the next run rather than forcing a re-auth.
    console.error(`[CRON] Error renewing token for account ${synchronization.externalId}:`, error);
    return false;
  }
}
