'use client';

import React, { useState } from 'react';
import { Download, Sparkles, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function LogoMakerPage() {
  const [formData, setFormData] = useState({
    businessName: '',
    industry: '',
    shape: 'square',
    color: 'طلا و مشکی',
    style: 'minimal',
  });

  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // پرامپت‌ساز حرفه‌ای بر اساس ورودی‌های کاربر
  const generateProfessionalPrompt = () => {
    const { businessName, industry, shape, color, style } = formData;

    const shapeDescriptions = {
      square: 'square frame, balanced proportions',
      circle: 'circular emblem, round composition',
      rectangle: 'horizontal rectangular layout',
      abstract: 'organic abstract shape',
    };

    const styleDescriptions = {
      minimal: 'flat design, minimalist vector logo, clean typography, luxury branding',
      modern: 'modern tech style, sharp geometric lines, premium corporate identity',
      classic: 'vintage elegant seal, classic luxury mark, detailed crafting',
      3d: '3D glossy metallic icon, modern isometric, high-end reflection',
    };

    return `Professional flat vector logo icon for a business named "${businessName}" in the field of "${industry}". ${styleDescriptions[style]}, ${shapeDescriptions[shape]}, primary colors: ${color}. White background, high resolution, no clutter, photorealistic vector art, centered design, highly detailed, centered emblem.`;
  };

  const handleGenerateLogo = async (e) => {
    e.preventDefault();
    if (!formData.businessName || !formData.industry) {
      setErrorMessage('لطفاً نام کسب‌وکار و حوزه فعالیت را وارد کنید.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setLogoUrl(null);

    const prompt = generateProfessionalPrompt();

    try {
      // استفاده از سرویس Pollinations AI (رایگان، بدون نیاز به API Key و بسیار باکیفیت)
      const encodedPrompt = encodeURIComponent(prompt);
      const seed = Math.floor(Math.random() * 1000000);
      const generatedImageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true&model=flux`;

      // پیش‌بارگذاری تصویر جهت اطمینان از ساخت کامل
      const img = new Image();
      img.src = generatedImageUrl;
      img.onload = () => {
        setLogoUrl(generatedImageUrl);
        setLoading(false);
      };
      img.onerror = () => {
        throw new Error('خطا در دریافت تصویر از سرور. لطفاً دوباره تلاش کنید.');
      };
    } catch (err) {
      console.error('Logo generation error:', err);
      setErrorMessage(err.message || 'خطا در ساخت لوگو. لطفاً مجدداً تلاش کنید.');
      setLoading(false);
    }
  };

  // تابع دانلود تصویر لوگو
  const handleDownload = async () => {
    if (!logoUrl) return;

    try {
      const response = await fetch(logoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `logo-${formData.businessName || 'moshtriyar'}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('خطا در دانلود فایل. می‌توانید روی تصویر راست کلیک کرده و Save Image را بزنید.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dir-rtl p-4 md:p-8 flex items-center justify-center font-sans">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        
        {/* هدر */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
            <h1 className="text-2xl font-bold">دستیار هوشمند طراحی لوگو</h1>
          </div>
          <p className="text-blue-100 text-sm">ویژه مشترکین VIP مشتری یار</p>
        </div>

        <div className="p-6 md:p-8">
          {/* نمایش پیام خطا */}
          {errorMessage && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* فرم دریافت اطلاعات */}
          <form onSubmit={handleGenerateLogo} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                نام کسب‌وکار یا برند *
              </label>
              <input
                type="text"
                placeholder="مثلاً: طلا راد"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                حوزه فعالیت / شغل *
              </label>
              <input
                type="text"
                placeholder="مثلاً: طلافروشی، کافه، املاک، پوشاک"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">شکل لوگو</label>
                <select
                  value={formData.shape}
                  onChange={(e) => setFormData({ ...formData, shape: e.target.value })}
                  className="w-full px-3 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
                >
                  <option value="square">مربع (Square)</option>
                  <option value="circle">دایره (Circle)</option>
                  <option value="rectangle">مستطیل (Rectangle)</option>
                  <option value="abstract">انتزاعی (Abstract)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">سبک طراحی</label>
                <select
                  value={formData.style}
                  onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                  className="w-full px-3 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
                >
                  <option value="minimal">مینیمال و مدرن</option>
                  <option value="modern">شرکتی و هندسی</option>
                  <option value="classic">کلاسیک و لوکس</option>
                  <option value="3d">سه‌بعدی و براق</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">رنگ‌های اصلی</label>
                <input
                  type="text"
                  placeholder="مثلاً: طلایی و قرمز"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full px-3 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>هوش مصنوعی در حال طراحی لوگو است... (لطفاً ۱۰ تا ۲۰ ثانیه صبر کنید)</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>شروع ساخت لوگو حرفه‌ای</span>
                </>
              )}
            </button>
          </form>

          {/* بخش نمایش خروجی و دانلود */}
          {logoUrl && (
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center animate-fade-in">
              <div className="flex items-center gap-2 text-emerald-600 font-semibold mb-4">
                <CheckCircle2 className="w-5 h-5" />
                <span>لوگوی اختصاصی شما آماده شد!</span>
              </div>

              <div className="relative group w-64 h-64 rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-100 bg-white mb-6">
                <img
                  src={logoUrl}
                  alt="تولید شده توسط هوش مصنوعی مشتری یار"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex gap-4 w-full max-w-md">
                <button
                  onClick={handleDownload}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  <span>دانلود لوگو با کیفیت بالا</span>
                </button>

                <button
                  onClick={handleGenerateLogo}
                  disabled={loading}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all flex items-center justify-center"
                  title="تولید طرح جدید"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
