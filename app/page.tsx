'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Cấu hình Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- ĐÂY LÀ PHẦN QUAN TRỌNG MÀ BẠN ĐANG THIẾU ---
export default function Dashboard() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      // Lấy dữ liệu từ Supabase
      const { data: analysisData, error } = await supabase
        .from('market_analysis')
        .select('*')
        .order('id', { ascending: false })
        .limit(100); 
      
      if (analysisData) setData(analysisData);
      if (error) console.log("Lỗi lấy data:", error.message);
    }
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center">
        <span className="text-green-500 mr-2">✦</span> AI Macro Desk
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map((item) => (
          <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-600 transition">
            
            {/* Header: Tên & Sentiment */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{item.asset_symbol}</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                item.sentiment === 'Bullish' ? 'bg-green-900 text-green-400' : 
                item.sentiment === 'Bearish' ? 'bg-red-900 text-red-400' : 'bg-gray-700 text-gray-300'
              }`}>
                {item.sentiment?.toUpperCase()}
              </span>
            </div>

            {/* Confidence Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Confidence</span>
                <span>{item.confidence}%</span>
              </div>
              <div className="w-full bg-gray-700 h-2 rounded-full">
                <div 
                  className={`h-2 rounded-full ${item.sentiment === 'Bullish' ? 'bg-green-500' : item.sentiment === 'Bearish' ? 'bg-red-500' : 'bg-gray-400'}`} 
                  style={{ width: `${item.confidence}%` }}
                ></div>
              </div>
            </div>

            {/* AI Analysis Text */}
            <div className="bg-gray-800/50 p-4 rounded-lg mb-4">
              <div className="flex items-center text-blue-400 text-xs mb-2 font-bold">
                <span className="mr-1">✨</span> AI Analysis
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                {item.summary}
              </p>
            </div>

            {/* Buy/Sell Zones */}
            <div className="grid grid-cols-2 gap-4 text-xs border-t border-gray-800 pt-4">
              <div>
                <span className="text-gray-500 block mb-1">Buy Zone</span>
                <span className="text-green-400 font-mono font-bold">{item.buy_zone}</span>
              </div>
              <div className="text-right">
                <span className="text-gray-500 block mb-1">Sell Zone</span>
                <span className="text-red-400 font-mono font-bold">{item.sell_zone}</span>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}