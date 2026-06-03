// app/api/cron/renew-tradovate-token/route.ts
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

/**
 * Helper function to check if current time matches the configured daily sync time
 * @param dailySyncTime The configured sync time from database
 * @returns true if it's time to sync (within 15 minutes of configured time)
 */
function shouldPerformDailySync(dailySyncTime: Date | null): boolean {
  if (!dailySyncTime) return false;
  
  const now = new Date();
  const syncHour = dailySyncTime.getUTCHours();
  const syncMinute = dailySyncTime.getUTCMinutes();
  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();
  
  // Calculate difference in minutes
  const syncTimeInMinutes = syncHour * 60 + syncMinute;
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  const diffInMinutes = Math.abs(currentTimeInMinutes - syncTimeInMinutes);
  
  // Check if we're within 15 minutes of the sync time (accounting for day wrap)
  return diffInMinutes <= 15 || diffInMinutes >= (24 * 60 - 15);
}

export async function GET(request: NextRequest) {
  // Verify this is a cron request
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Get all users with Tradovate tokens from your database
    const synchronizations = await prisma.synchronization.findMany({
      where: {
        service: 'tradovate',
        token: { not: null }
      }
    });

    // Every acquisition path stores a tokenExpiresAt alongside the token, and the
    // only thing that nulls the expiry is this cron (which also nulls the token).
    // So a token with a null expiry is a corrupt/legacy row, not a valid token —
    // clear it.
    const missingExpiry = synchronizations.filter((s) => !s.tokenExpiresAt);
    if (missingExpiry.length > 0) {
      console.warn(`[CRON] Clearing ${missingExpiry.length} Tradovate tokens missing tokenExpiresAt`);
      await prisma.synchronization.updateMany({
        where: {
          id: { in: missingExpiry.map((s) => s.id) }
        },
        data: { token: null, tokenExpiresAt: null }
      });
    }

    const validSynchronizations = synchronizations.filter((s) => !!s.tokenExpiresAt);

    let tokenRenewals = 0;
    let dailySyncs = 0;

    const promises = validSynchronizations.map(async (synchronization) => {
      let renewed = false;
      let synced = false;
      
      // Always attempt renewal for each token
      renewed = await renewUserToken(synchronization);
      
      // Check if we should perform daily sync
      if (shouldPerformDailySync(synchronization.dailySyncTime)) {
        synced = await performDailySync(synchronization);
      }
      
      return { renewed, synced };
    });

    const results = await Promise.allSettled(promises);
    
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        if (result.value.renewed) tokenRenewals++;
        if (result.value.synced) dailySyncs++;
      }
    });
    
    return Response.json({ 
      success: true, 
      processed: synchronizations.length,
      tokenRenewals,
      dailySyncs
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return Response.json({ error: 'Cron job failed' }, { status: 500 });
  }
}

/**
 * Clears the stored token for a synchronization, effectively marking it as expired
 * so the user is prompted to re-authenticate. This must only be called once a
 * renewal test against Tradovate has been performed and definitively failed
 * (i.e. Tradovate rejected the token), never on a transient/network failure.
 */
async function expireToken(synchronization: any): Promise<void> {
  await prisma.user.update({
    where: { id: synchronization.userId },
    data: {
      synchronizations: {
        update: {
          where: { id: synchronization.id },
          data: { token: null, tokenExpiresAt: null }
        }
      }
    }
  });
}

/**
 * Attempts to renew the Tradovate access token for a given synchronization record.
 *
 * - It always tests the token by calling the Tradovate renewAccessToken endpoint.
 * - If the renewal is successful, updates the token and its expiration in the database.
 * - The token is only marked as expired (cleared) when the test DEFINITIVELY fails,
 *   i.e. Tradovate explicitly rejects the token (HTTP 401/403, or a 200 response
 *   carrying an errorText). Transient failures — network errors, timeouts,
 *   rate-limiting (429) or server errors (5xx) — leave the token untouched so the
 *   next cron run can retry instead of forcing a needless re-authentication.
 *
 * @param synchronization The synchronization record containing user, environment, and token info.
 */
async function renewUserToken(synchronization: any): Promise<boolean> {
  let renewal: Response;
  try {
    const apiBaseUrl = synchronization.environment === 'demo'
      ? 'https://demo.tradovateapi.com'
      : 'https://live.tradovateapi.com';

    console.log(`[CRON] Attempting token renewal for account ${synchronization.accountId}`);

    renewal = await fetch(`${apiBaseUrl}/auth/renewAccessToken`, {
      headers: {
        'Authorization': `Bearer ${synchronization.token}`
      }
    });
  } catch (error) {
    // Network/transport error: the token could NOT be tested. Do not expire it —
    // leave it for the next cron run to retry.
    console.error(`[CRON] Could not reach Tradovate to test token for account ${synchronization.accountId} (will retry):`, error);
    return false;
  }

  try {
    if (!renewal.ok) {
      const errorText = await renewal.text();

      // Only an explicit authentication rejection means the token is truly dead.
      // Other statuses (429 rate-limit, 5xx server errors, …) are transient.
      if (renewal.status === 401 || renewal.status === 403) {
        console.error(`[CRON] Tradovate rejected token for account ${synchronization.accountId} (status ${renewal.status}), marking expired: ${errorText}`);
        await expireToken(synchronization);
      } else {
        console.warn(`[CRON] Transient renewal failure for account ${synchronization.accountId} (status ${renewal.status}), will retry: ${errorText}`);
      }
      return false;
    }

    const renewalData = await renewal.json();

    // A 200 response can still carry an errorText when the token is invalid.
    if (renewalData.errorText || !renewalData.accessToken) {
      console.error(`[CRON] Tradovate renewal failed for account ${synchronization.accountId}, marking expired: ${renewalData.errorText || 'no accessToken returned'}`);
      await expireToken(synchronization);
      return false;
    }

    // Update database with the renewed token
    await prisma.user.update({
      where: { id: synchronization.userId },
      data: {
        synchronizations: {
          update: {
            where: { id: synchronization.id },
            data: { token: renewalData.accessToken, tokenExpiresAt: new Date(renewalData.expirationTime) }
          }
        }
      }
    });

    return true;
  } catch (error) {
    // Error while parsing the response or persisting the renewal. The token was
    // not proven invalid, so keep it and retry on the next run.
    console.error(`[CRON] Error processing renewal for account ${synchronization.accountId} (will retry):`, error);
    return false;
  }
}

/**
 * Performs a daily sync for the given synchronization by fetching trades from Tradovate
 * 
 * @param synchronization The synchronization record containing user, token, and account info.
 */
async function performDailySync(synchronization: any): Promise<boolean> {
  try {
    console.log(`[CRON] Performing daily sync for account ${synchronization.accountId}`);
    
    // Dynamically import the getTradovateTrades action to avoid circular dependencies
    const { getTradovateTrades } = await import('@/app/[locale]/dashboard/components/import/tradovate/sync/actions');
    
    // Use account-level fee config from DB (includedFeeTypes on sync record)
    const includedFeeTypes = synchronization.includedFeeTypes as Record<string, boolean> | null | undefined
    const result = await getTradovateTrades(synchronization.token, {
      userId: synchronization.userId,
      includedFeeTypes: includedFeeTypes ?? undefined,
    });
    
    if (result.error) {
      console.error(`[CRON] Failed to sync trades for account ${synchronization.accountId}:`, result.error);
      return false;
    }
    
    console.log(`[CRON] Successfully synced ${result.savedCount || 0} trades for account ${synchronization.accountId}`);
    return true;
  } catch (error) {
    console.error(`[CRON] Error during daily sync for account ${synchronization.accountId}:`, error);
    return false;
  }
}