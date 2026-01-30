import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. Cấu hình
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const ASSETS = [
  'BTCUSD', 'ETHUSD', // Crypto
  'XAUUSD', // Gold
  'EURUSD', 'GBPUSD', 'USDJPY' // Forex
];

// --- HÀM LẤY GIÁ THỰC TẾ (Sống còn) ---
async function getRealtimePrice(asset: string) {
    try {
        // Mẹo: Dùng Binance lấy giá Gold (PAXG) tham khảo hoặc các nguồn Free khác nếu AlphaVantage hết lượt
        // Ở đây mình ưu tiên Binance cho Crypto vì nó siêu nhanh và Free
        if (asset === 'BTCUSD' || asset === 'ETHUSD') {
            const symbol = asset.replace('USD', 'USDT');
            const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
            const data = await res.json();
            return parseFloat(data.price).toFixed(2);
        }
        
        // Với Gold/Forex: Tạm thời dùng AlphaVantage (Nhớ là nó giới hạn 25 req/ngày)
        // Nếu bạn chạy nhiều, hãy cân nhắc mua gói hoặc tìm API khác.
        const key = process.env.ALPHAVANTAGE_API_KEY; 
        if (key) { 
            // Logic lấy giá AlphaVantage (như cũ)
            const from = asset.slice(0, 3);
            const to = asset.slice(3, 6);
            const res = await fetch(`https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${key}`);
            const data = await res.json();
            const rate = data['Realtime Currency Exchange Rate']?.['5. Exchange Rate'];
            return rate ? parseFloat(rate).toFixed(2) : null;
        }
    } catch (e) {
        console.error(`Lỗi lấy giá ${asset}:`, e);
    }
    return null; // Trả về null nếu không lấy được
}

export async function GET(request: Request) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const results = [];
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    for (const asset of ASSETS) {
      // 1. LẤY GIÁ LIVE
      let currentPrice = await getRealtimePrice(asset);
      
      // Nếu không lấy được giá (do lỗi API), dùng giá mặc định để AI không bị ngáo
      const priceText = currentPrice ? `Giá hiện tại đang là: ${currentPrice}` : "Không lấy được giá live, hãy tự ước lượng";

      // 2. GỬI CHO AI
      const prompt = `
        Bạn là chuyên gia HybridTrader đang sống ở năm 2026.
        Dữ liệu thị trường: ${asset}. ${priceText}.
        Phân tích xu hướng NGẮN GỌN.
        Trả về JSON:
        {
          "asset": "${asset}",
          "sentiment": "Bullish/Bearish/Neutral",
          "confidence": 85,
          "summary": "Nhận định (Bắt buộc nhắc đến giá ${currentPrice || 'này'} trong câu)",
          "buy_zone": "Vùng mua (Dựa trên giá ${currentPrice})",
          "sell_zone": "Vùng bán (Dựa trên giá ${currentPrice})"
        }
      `;

      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json|```/g, '').trim(); 
        const data = JSON.parse(text);

        // 3. LƯU DATABASE
        await supabase.from('market_analysis').insert({
          report_date: today,
          asset_symbol: data.asset,
          sentiment: data.sentiment,
          confidence: data.confidence,
          summary: data.summary, 
          buy_zone: data.buy_zone,
          sell_zone: data.sell_zone
        });
        results.push(data);
      } catch (err) { console.error(err); }
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}