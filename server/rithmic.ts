'use server'

import { z } from 'zod'

interface RithmicResponse {
  success: boolean
  message: string
  accounts: Array<{
    account_id: string
    account_name?: string
    account_type?: string
  }>
}

const GATEWAY_TO_SERVER = {
  'test': 'TEST',
  'paper': 'PAPER',
  'r01': 'R01',
  'r04': 'R04',
} as const

const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  gateway: z.enum(['test', 'paper', 'r01', 'r04'])
})

export async function connectToRithmic(credentials: z.infer<typeof credentialsSchema>) {
  try {
    // Validate input
    const validatedCredentials = credentialsSchema.parse(credentials)
    
    const response = await fetch('http://localhost:8000/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: validatedCredentials.username,
        password: validatedCredentials.password,
        server_name: GATEWAY_TO_SERVER[validatedCredentials.gateway],
        num_days: 1
      }),
    })

    const data: RithmicResponse = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Connection failed')
    }

    if (!data.accounts || data.accounts.length === 0) {
      throw new Error('No accounts found for this user')
    }

    return {
      success: true,
      message: data.message,
      accounts: data.accounts.map(account => ({
        id: account.account_id,
        name: account.account_name || account.account_id,
        type: account.account_type || 'Futures'
      }))
    }

  } catch (error) {
    console.error('Rithmic connection error:', error)
    throw error instanceof Error 
      ? error 
      : new Error('Internal server error')
  }
} 

interface RithmicOrdersResponse {
  success: boolean
  message: string
  orders: Array<{
    order_id: string
    account_id: string
    symbol: string
    exchange: string
    side: string
    order_type: string
    status: string
    quantity: number
    filled_quantity: number
    price: number
    commission: number
    timestamp: number
  }>
  accounts_processed: number
  total_accounts_available: number
}

const fetchOrdersSchema = z.object({
  credentials: z.object({
    username: z.string().min(1),
    password: z.string().min(1),
    gateway: z.enum(['test', 'paper', 'r01', 'r04'])
  }),
  accounts: z.array(z.string().min(1))
})

export async function fetchRithmicOrders(input: z.infer<typeof fetchOrdersSchema>) {
  try {
    // Validate input
    const validated = fetchOrdersSchema.parse(input)
    
    const response = await fetch('http://localhost:8000/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: validated.credentials.username,
        password: validated.credentials.password,
        server_name: GATEWAY_TO_SERVER[validated.credentials.gateway],
        account_ids: validated.accounts
      }),
    })

    const data: RithmicOrdersResponse = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch orders')
    }

    return {
      success: true,
      message: data.message,
      orders: data.orders.map(order => ({
        order_id: order.order_id,
        account_id: order.account_id,
        ticker: order.symbol,
        exchange: order.exchange,
        buy_sell_type: order.side,
        order_type: order.order_type,
        status: order.status,
        quantity: order.quantity,
        filled_quantity: order.filled_quantity,
        price: order.price,
        commission: order.commission,
        timestamp: order.timestamp
      })),
      accounts_processed: data.accounts_processed,
      total_accounts_available: data.total_accounts_available
    }

  } catch (error) {
    console.error('Rithmic fetch orders error:', error)
    throw error instanceof Error 
      ? error 
      : new Error('Internal server error')
  }
} 