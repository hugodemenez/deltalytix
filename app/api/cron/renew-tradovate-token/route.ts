// app/api/cron/renew-tradovate-token/route.ts
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

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
        token: { not: null },
        tokenExpiresAt: { not: null }
      }
    });

    const renewalPromises = synchronizations.map(async (synchronization) => {
      const expiresAt = new Date(synchronization.tokenExpiresAt!);
      const now = new Date();
      
      // If expires within 15 minutes, renew
      if (expiresAt.getTime() - now.getTime() < 15 * 60 * 1000) {
        return renewUserToken(synchronization);
      }
      return null;
    });

    const results = await Promise.allSettled(renewalPromises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    
    return Response.json({ 
      success: true, 
      processed: synchronizations.length,
      renewed: successful 
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return Response.json({ error: 'Cron job failed' }, { status: 500 });
  }
}

async function renewUserToken(synchronization: any) {
  try {
    const apiBaseUrl = user.tradovateEnvironment === 'demo' 
      ? 'https://demo.tradovateapi.com' 
      : 'https://live.tradovateapi.com';
    
    const renewal = await fetch(`${apiBaseUrl}/auth/renewAccessToken`, {
      headers: {
        'Authorization': `Bearer ${synchronization.token}`
      }
    });
    
    if (!renewal.ok) {
      // Remove invalid token
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
      return false;
    }

    const renewalData = await renewal.json();
    
    // Update database
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
    console.error(`Failed to renew token for user ${synchronization.userId}:`, error);
    return false;
  }
}