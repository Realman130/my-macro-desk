import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. Cấu hình Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

// 2. Cấu hình Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const ASSETS = [
  'XAUUSD (Gold)', 'BTCUSD (Bitcoin)', 'DXY (US Dollar Index)', 
  'US10Y (US 10-Year Bond)', 'US100 (Nasdaq 100)', 'US30 (Dow Jones)',
  'SPX500 (S&P 500)', 'EURUSD', 'GBPUSD', 'USDJPY'
];

export async function GET(request: Request) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const results = [];

    // --- CẤU HÌNH QUAN TRỌNG: MODEL CÓ SEARCH ---
    // Lưu ý: Cần dùng model hỗ trợ search (thường là bản Pro hoặc Flash 002 trở lên)
    // Nếu bản 2.5-flash chưa hỗ trợ tool qua thư viện này, hãy thử gemini-1.5-pro-002
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-pro-002", // Bản Pro 002 hỗ trợ Tools tốt nhất
        // model: "gemini-2.0-flash-exp", // Hoặc thử bản này nếu muốn nhanh
        tools: [
            { googleSearch: {} } // <--- ĐÂY LÀ CHÌA KHÓA: BẮT AI TRA GOOGLE
        ]
    });

    for (const asset of ASSETS) {
      // Prompt ép AI phải tìm tin mới nhất
      const prompt = `
        Hãy sử dụng Google Search để tìm dữ liệu MỚI NHẤT (Live Data) ngay lúc này về: ${asset}.
        Tìm kiếm: "Giá ${asset} hiện tại", "Tin tức ${asset} hôm nay ${today}".
        
        Sau đó đóng vai chuyên gia HybridTrader phân tích xu hướng.
        Trả về JSON duy nhất:
        {
          "asset": "${asset}",
          "sentiment": "Bullish" / "Bearish" / "Neutral",
          "confidence": 85, 
          "summary": "Dẫn chứng tin tức nóng hổi vừa tìm được (VD: CPI vừa ra tăng...)",
          "buy_zone": "Vùng giá khuyến nghị",
          "sell_zone": "Vùng giá khuyến nghị"
        }
      `;

      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json|```/g, '').trim(); 
        const data = JSON.parse(text);

        // Lưu DB (Xóa cũ lưu mới nếu muốn cập nhật đè trong ngày)
        // Ở đây mình insert thêm bản ghi mới
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
      } catch (err) {
        console.error(`Lỗi ${asset}:`, err);
      }
    }

    return NextResponse.json({ success: true, count: results.length, data: results });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}