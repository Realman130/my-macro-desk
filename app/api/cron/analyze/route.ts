export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

/**
 * asset examples:
 * - BTCUSD
 * - ETHUSD
 * - EURUSD
 * - GBPUSD
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const asset = (searchParams.get('asset') || '').toUpperCase()

    if (!asset) {
      return NextResponse.json(
        { error: 'Missing asset param. Example: ?asset=BTCUSD' },
        { status: 400 }
      )
    }

    // ===== CRYPTO → BINANCE =====
    if (asset === 'BTCUSD' || asset === 'ETHUSD') {
      const symbol = asset.replace('USD', 'USDT')

      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
        { cache: 'no-store' }
      )

      if (!res.ok) throw new Error('Binance API error')

      const j = await res.json()

      return NextResponse.json({
        asset,
        type: 'crypto',
        source: 'binance',
        price: Number(j.lastPrice),
        change24hPct: Number(j.priceChangePercent),
        high24h: Number(j.highPrice),
        low24h: Number(j.lowPrice),
        timestamp: new Date().toISOString(),
      })
    }

    // ===== FX / MACRO → ALPHAVANTAGE =====
    if (asset.length === 6) {
      const from = asset.slice(0, 3)
      const to = asset.slice(3, 6)

      const key = process.env.ALPHAVANTAGE_API_KEY
      if (!key) throw new Error('Missing ALPHAVANTAGE_API_KEY')

      const url =
        `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE` +
        `&from_currency=${from}&to_currency=${to}&apikey=${key}`

      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error('AlphaVantage API error')

      const j = await res.json()
      const data = j['Realtime Currency Exchange Rate']
      if (!data) throw new Error('Invalid AlphaVantage response')

      return NextResponse.json({
        asset,
        type: 'fx',
        source: 'alphavantage',
        price: Number(data['5. Exchange Rate']),
        bid: Number(data['8. Bid Price']),
        ask: Number(data['9. Ask Price']),
        lastRefreshed: data['6. Last Refreshed'],
        timestamp: new Date().toISOString(),
      })
    }

    return NextResponse.json(
      { error: `Unsupported asset: ${asset}` },
      { status: 400 }
    )
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 }
    )
  }
}
