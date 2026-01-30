import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const ASSETS = [
  'XAUUSD (Gold)',
  'BTCUSD (Bitcoin)',
  'DXY (US Dollar Index)',
  'US10Y (US 10-Year Bond)',
  'US100 (Nasdaq 100)',
  'US30 (Dow Jones)',
  'SPX500 (S&P 500)',
  'EURUSD',
  'GBPUSD',
  'USDJPY'
]

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]
    const results: any[] = []

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro-002',
      tools: [{ googleSearch: {} }]
    })

    for (const asset of ASSETS) {
      const prompt = `
Hãy sử dụng Google Search để tìm dữ liệu MỚI NHẤT (Live Data) về ${asset} hôm nay ${today}.
Sau đó phân tích xu hướng trader chuyên nghiệp.

Trả về JSON:
{
  "asset": "${asset}",
  "sentiment": "Bullish" | "Bearish" | "Neutral",
  "confidence": 85,
  "summary": "Tin tức mới",
  "buy_zone": "Vùng mua",
  "sell_zone": "Vùng bán"
}
      `

      try {
        const result = await model.generateContent(prompt)
        const text = result.response.text().replace(/```json|```/g, '').trim()
        const data = JSON.parse(text)

        await supabase.from('market_analysis').insert({
          report_date: today,
          asset_symbol: data.asset,
          sentiment: data.sentiment,
          confidence: data.confidence,
          summary: data.summary,
          buy_zone: data.buy_zone,
          sell_zone: data.sell_zone
        })

        results.push(data)
      } catch (e) {
        console.error('Asset error:', asset, e)
      }
    }

    return NextResponse.json({ success: true, data: results })
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 }
    )
  }
}
