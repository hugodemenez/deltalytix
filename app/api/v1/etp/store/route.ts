import { PrismaClient } from '@prisma/client'

// Create a new PrismaClient instance for this API route
const prisma = new PrismaClient()

// Common authentication function to use across all methods
async function authenticateRequest(req: Request) {
  // Log all headers for debugging
  console.log('All request headers:');
  const headerEntries = Array.from(req.headers.entries());
  console.log(JSON.stringify(headerEntries, null, 2));
  
  // Try multiple ways to get the authorization header
  const authHeader = req.headers.get('authorization') || 
                     req.headers.get('Authorization') || 
                     req.headers.get('Proxy-Authorization');
  
  // Check for Vercel proxy signature which contains the token in production
  const vercelProxySignature = req.headers.get('x-vercel-proxy-signature');
  
  console.log('Auth header found:', authHeader ? 'Yes' : 'No');
  console.log('Vercel proxy signature found:', vercelProxySignature ? 'Yes' : 'No');
  
  // Check for token in query params as fallback
  const url = new URL(req.url);
  const queryToken = url.searchParams.get('token');
  
  // Extract token from available sources
  let token;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
    console.log('Using token from Authorization header');
  } else if (vercelProxySignature && vercelProxySignature.startsWith('Bearer ')) {
    token = vercelProxySignature.split(' ')[1];
    console.log('Using token from x-vercel-proxy-signature header');
  } else if (queryToken) {
    token = queryToken;
    console.log('Using token from query parameter');
  }
  
  if (!token) {
    console.log('No valid authorization method found');
    return { 
      authenticated: false, 
      error: {
        message: 'No valid authorization token found',
        status: 401
      }
    };
  }
  
  console.log('Token available:', token ? 'Yes' : 'No');
  console.log('Token value:', token);
  
  try {
    // Verify the token by finding the user
    const user = await prisma.user.findFirst({
      where: {
        etpToken: token
      }
    });
    
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      return { 
        authenticated: false, 
        error: {
          message: 'No user found with the provided token',
          status: 401
        }
      };
    }
    
    return { authenticated: true, user };
  } catch (error) {
    console.error('Prisma error during authentication:', error);
    return {
      authenticated: false,
      error: {
        message: 'Database error during authentication',
        status: 500
      }
    };
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authenticateRequest(req);
    
    if (!auth.authenticated) {
      return new Response(JSON.stringify({ 
        error: 'Unauthorized', 
        message: auth.error?.message 
      }), { status: auth.error?.status || 401 });
    }
    
    const user = auth.user!;
    
    // Parse the request body
    const body = await req.json();
    const { orders } = body;
    
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid orders data' }), { status: 400 });
    }
    
    // Process and store each order
    const createdOrders = await Promise.all(
      orders.map(async (order) => {
        return prisma.order.upsert({
          where: {
            orderId: order.OrderId
          },
          update: {
            accountId: order.AccountId,
            orderId: order.OrderId,
            orderAction: order.OrderAction,
            quantity: order.Quantity,
            averageFilledPrice: order.AverageFilledPrice,
            isOpeningOrder: order.IsOpeningOrder,
            time: new Date(order.Time),
            symbol: order.Instrument.Symbol,
            instrumentType: order.Instrument.Type
          },
          create: {
            accountId: order.AccountId,
            orderId: order.OrderId,
            orderAction: order.OrderAction,
            quantity: order.Quantity,
            averageFilledPrice: order.AverageFilledPrice,
            isOpeningOrder: order.IsOpeningOrder,
            time: new Date(order.Time),
            symbol: order.Instrument.Symbol,
            instrumentType: order.Instrument.Type,
            userId: user.id
          }
        });
      })
    );
    
    console.log(`Orders stored: ${createdOrders.length}`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: `${createdOrders.length} orders stored successfully` 
    }), { status: 200 });
    
  } catch (error) {
    console.error('Error storing orders:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to store orders', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }), { status: 500 });
  } finally {
    // Disconnect Prisma client to prevent connection pool issues
    await prisma.$disconnect();
  }
}

export async function GET(req: Request) {
  try {
    const auth = await authenticateRequest(req);
    
    if (!auth.authenticated) {
      return new Response(JSON.stringify({ 
        error: 'Unauthorized', 
        message: auth.error?.message 
      }), { status: auth.error?.status || 401 });
    }
    
    const user = auth.user!;
    
    // Get query parameters
    const url = new URL(req.url);
    const accountId = url.searchParams.get('accountId');
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 100;
    const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!) : 0;
    const fromDate = url.searchParams.get('from');
    const toDate = url.searchParams.get('to');
    
    // Build the query
    const query: any = {
      where: {
        userId: user.id
      },
      orderBy: {
        time: 'desc' as const
      },
      take: limit,
      skip: offset
    };
    
    // Add filters if provided
    if (accountId) {
      query.where.accountId = accountId;
    }
    
    if (fromDate || toDate) {
      query.where.time = {};
      
      if (fromDate) {
        query.where.time.gte = new Date(fromDate);
      }
      
      if (toDate) {
        query.where.time.lte = new Date(toDate);
      }
    }
    
    // Get orders
    const orders = await prisma.order.findMany(query);
    
    // Get total count for pagination
    const totalCount = await prisma.order.count({
      where: query.where
    });
    
    console.log(`Orders retrieved: ${orders.length}, total: ${totalCount}`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: {
        orders,
        pagination: {
          total: totalCount,
          limit,
          offset
        }
      }
    }), { status: 200 });
    
  } catch (error) {
    console.error('Error retrieving orders:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to retrieve orders', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }), { status: 500 });
  } finally {
    // Disconnect Prisma client to prevent connection pool issues
    await prisma.$disconnect();
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await authenticateRequest(req);
    
    if (!auth.authenticated) {
      return new Response(JSON.stringify({ 
        error: 'Unauthorized', 
        message: auth.error?.message 
      }), { status: auth.error?.status || 401 });
    }
    
    const user = auth.user!;
    
    // Delete all orders for this user
    const result = await prisma.order.deleteMany({
      where: {
        userId: user.id
      }
    });
    
    console.log(`Orders deleted: ${result.count}`);
    
    return new Response(JSON.stringify({
      success: true,
      message: `${result.count} orders deleted successfully`
    }), { status: 200 });
    
  } catch (error) {
    console.error('Error deleting orders:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to delete orders', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }), { status: 500 });
  } finally {
    // Disconnect Prisma client to prevent connection pool issues
    await prisma.$disconnect();
  }
} 