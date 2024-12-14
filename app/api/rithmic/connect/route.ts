import { NextResponse } from 'next/server'

interface Credentials {
  username: string
  password: string
}

interface OrderResponse {
  success: boolean
  message: string
  orders: Record<string, any>[]
}

export async function POST(request: Request) {
  try {
    const credentials: Credentials = await request.json()
    
    const response = await fetch('http://localhost:8000/fetch-orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: credentials.username,
        password: credentials.password,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(
        { success: false, message: error.detail || 'Connection failed' },
        { status: response.status }
      )
    }

    const data: OrderResponse = await response.json()
    return NextResponse.json({
      success: data.success,
      message: data.message,
      orders: data.orders,
    })
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
} 