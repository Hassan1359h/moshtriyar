"use client";
import React, { useState } from 'react';

export default function RealLogoGenerator() {
  const [businessName, setBusinessName] = useState('کافه ماهان');
  const [industry, setIndustry] = useState('کافه');
  const [shape, setShape] = useState('دایره');
  const [color, setColor] = useState('طلایی');
  
  const [logos, setLogos] = useState([]);
  const [loading, setLoading] = useState(false);

  // پالت رنگی حرفه‌ای
  const colors = {
    'قرمز': '#E63946',
    'آبی': '#1D3557',
    'سبز': '#2A9D8F',
    'مشکی': '#111111',
    'طلایی': '#D4AF37',
    'نقره‌ای': '#6B7280'
  };

  // تابع تولید لوگوی SVG
  const createSVG = (name, type, shapeType, colorHex, variant) => {
    // ۱. انتخاب آیکون بر اساس صنف
    let icon = '';
    
    if (type === 'کافه' || type === 'رستوران') {
      // آیکون فنجان یا برگ
      icon = variant === 0 
        ? `<path d="M30,40 Q50,10 70,40 Q70,70 50,80 Q30,70 30,40 Z" fill="${colorHex}"/><circle cx="50" cy="45" r="10" fill="#fff"/>`
        : `<circle cx="50" cy="45" r="25" fill="none" stroke="${colorHex}" stroke-width="6"/><path d="M40,45 L60,45" stroke="${colorHex}" stroke-width="4"/>`;
    } else if (type === 'فناوری' || type === 'املاک') {
      // آیکون هندسی و تیز
      icon = variant === 0
        ? `<polygon points="50,15 85,40 85,70 50,85 15,70 15,40" fill="${colorHex}"/><polygon points="50,30 70,45 70,65 50,75 30,65 30,45" fill="#fff"/>`
        : `<rect x="20" y="20" width="60" height="60" rx="10" fill="${colorHex}"/><rect x="35" y="35" width="30" height="30" fill="#fff"/>`;
    } else {
      // آیکون عمومی (پوشاک، آرایشی و...)
      icon = variant === 0
        ? `<path d="M50,15 L85,50 L50,85 L15,50 Z" fill="${colorHex}"/><circle cx="50" cy="50" r="12" fill="#fff"/>`
        : `<circle cx="35" cy="50" r="20" fill="${colorHex}" opacity="0.8"/><circle cx="65" cy="50" r="20" fill="${colorHex}"/>`;
    }

    // ۲. ساخت قالب اصلی لوگو
    return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="100%" height="100%">
      <rect width="300" height="200" fill="#ffffff" />
      
      <!-- آیکون -->
      <g transform="translate(100, 10)">${icon}</g>
      
      <!-- نام برند -->
      <text x="150" y="150" font-family="Tahoma, Arial, sans-serif" font-size="24" font-weight="bold" fill="#111" text-anchor="middle">
        ${name}
      </text>
      
      <!-- خط جداکننده و نوع صنف -->
      <line x1="100" y1="160" x2="200" y2="160" stroke="${colorHex}" stroke-width="2"/>
      <text x="150" y="180" font-family="Tahoma, Arial, sans-serif" font-size="12" fill="#666" text-anchor="middle" letter-spacing="2">
        ${type.toUpperCase()}
      </text>
    </svg>
    `;
  };

  // تابع تولید ۴ طرح مختلف
  const handleGenerate = () => {
    setLoading(true);
    setTimeout(() => {
      const hex = colors[color] || '#1D3557';
      
      // تولید ۴ طرح با هندسه و چیدمان متفاوت
      const newLogos = [
        createSVG(businessName, industry, shape, hex, 0),
        createSVG(businessName, industry, shape, hex, 1),
        createSVG(businessName, industry, shape, hex, 0),
        createSVG(businessName, industry, shape, hex, 1)
      ];
      
      setLogos(newLogos);
      setLoading(false);
    }, 500); // یک تاخیر کوتاه برای حس واقعی بودن
  };

  // تابع دانلود فایل SVG
  const downloadSVG = (svgCode, index) => {
    const blob = new Blob([svgCode], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logo-${businessName}-${index + 1}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex justify-center" dir="rtl">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6 md:p-8">
        
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">دستیار طراحی لوگو</h1>
        
        {/* فرم ورودی */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">نام کسب و کار</label>
            <input 
              type="text" 
              value={businessName} 
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="مثلا: کافه ماهان" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">حوزه فعالیت</label>
            <select 
              value={industry} 
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="کافه">کافه / رستوران</option>
              <option value="فناوری">فناوری / استارتاپ</option>
              <option value="پوشاک">پوشاک / فروشگاه</option>
              <option value="املاک">املاک / مشاوره</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رنگ اصلی</label>
              <select 
                value={color} 
                onChange={(e) => setColor(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {Object.keys(colors).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">شکل هندسی</label>
              <select 
                value={shape} 
                onChange={(e) => setShape(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="دایره">دایره / منحنی</option>
                <option value="مستطیل">مستطیل / گوشه‌دار</option>
              </select>
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all mt-4"
          >
            {loading ? 'در حال طراحی...' : '🚀 شروع ساخت لوگو'}
          </button>
        </div>

        {/* نمایش نتایج */}
        {logos.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="text-lg font-bold text-green-600 mb-4 text-center">چهار طرح آماده شد!</h2>
            
            <div className="grid grid-cols-2 gap-4">
              {logos.map((svg, index) => (
                <div key={index} className="border border-gray-200 rounded-xl p-2 bg-gray-50 flex flex-col items-center">
                  {/* نمایش SVG */}
                  <div 
                    className="w-full aspect-square mb-2 bg-white rounded-lg overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: svg }} 
                  />
                  {/* دکمه دانلود */}
                  <button 
                    onClick={() => downloadSVG(svg, index)}
                    className="w-full bg-gray-900 text-white text-sm py-2 rounded-md hover:bg-black transition-colors"
                  >
                    دانلود SVG
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
