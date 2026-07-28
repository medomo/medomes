import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, UserRole } from '../types';
import { Shield, MapPin, KeyRound, UserRound, Zap, AlertCircle, Smartphone, Download, X } from 'lucide-react';

interface LoginProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ users, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // PWA Installation State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if device is Android
    const ua = navigator.userAgent.toLowerCase();
    const android = ua.indexOf('android') > -1;
    setIsAndroid(android);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If already in standalone mode, don't show the prompt
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBanner(false);
    } else {
      // For demonstration & ease of install, if not standalone we can show a prompt
      // even if the browser doesn't fire beforeinstallprompt yet, we can guide them!
      const dismissed = localStorage.getItem('voltera_pwa_dismissed');
      if (!dismissed) {
        // Show after 2 seconds for visibility
        const timer = setTimeout(() => {
          setShowInstallBanner(true);
        }, 2000);
        return () => clearTimeout(timer);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install: ${outcome}`);
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    } else {
      // Standard Android Chrome instructions fallback
      alert('لتثبيت التطبيق على جهاز أندرويد الخاص بك:\n\n1. اضغط على أيقونة النقاط الثلاث (⋮) في أعلى أو أسفل المتصفح.\n2. اختر "تثبيت التطبيق" أو "الإضافة إلى الشاشة الرئيسية" (Add to Home screen).\n3. سيظهر التطبيق فوراً على شاشتك الرئيسية كأيقونة مستقلة سريعة العمل!');
      setShowInstallBanner(false);
      localStorage.setItem('voltera_pwa_dismissed', 'true');
    }
  };

  const handleDismissBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('voltera_pwa_dismissed', 'true');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const user = users.find(
      u => u.username.toLowerCase() === username.trim().toLowerCase() && 
           u.passwordHash === password
    );

    if (!user) {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة.');
      return;
    }

    if (user.status === 'suspended') {
      setError('هذا الحساب موقوف حالياً، يرجى مراجعة إدارة النظام.');
      return;
    }

    onLoginSuccess(user);
  };

  const handleAutoFill = (role: UserRole) => {
    if (role === 'admin') {
      setUsername('admin');
      setPassword('admin');
    } else {
      setUsername('coll1');
      setPassword('123');
    }
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 p-4 relative overflow-hidden">
      {/* Dynamic Background Subtle Gradients */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-amber-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-200/40 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-xl p-8 relative z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-amber-400/15 rounded-2xl border border-amber-400/30 mb-4">
            <Zap className="w-8 h-8 text-amber-500 fill-amber-500" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 font-sans tracking-tight">نظام فوترة الكهرباء التجارية</h1>
          <p className="text-xs text-slate-500 mt-1.5 font-sans">بوابة تسجيل الدخول الموحدة للموظفين والإدارة - فولتير</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-start gap-2 bg-rose-50 border border-rose-100 p-3 rounded-xl text-rose-700 text-xs text-right"
            >
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 text-right">اسم المستخدم</label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="اسم المستخدم"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-900 text-right text-sm placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-all font-sans"
              />
              <UserRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 text-right">كلمة المرور</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-900 text-right text-sm placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-all"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-bold py-3.5 rounded-xl shadow-md transition-all duration-300 transform active:scale-95 cursor-pointer"
          >
            تسجيل الدخول الآمن
          </button>
        </form>

        {/* Quick Testing Accounts */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-center text-[11px] text-slate-500 mb-3 font-sans font-medium">اضغط للتعبئة التلقائية السريعة والتجربة:</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleAutoFill('admin')}
              className="flex flex-col items-center gap-1 p-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl hover:bg-slate-100/80 transition-all text-[11px] text-slate-700 text-center"
            >
              <span className="font-bold text-slate-900">حساب المدير</span>
              <span className="text-[10px] text-slate-500 leading-relaxed">اسم المستخدم: admin<br />كلمة المرور: admin</span>
            </button>
            <button
              onClick={() => handleAutoFill('collector')}
              className="flex flex-col items-center gap-1 p-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl hover:bg-slate-100/80 transition-all text-[11px] text-slate-700 text-center"
            >
              <span className="font-bold text-slate-900">حساب المحصل</span>
              <span className="text-[10px] text-slate-500 leading-relaxed">اسم المستخدم: coll1<br />كلمة المرور: 123</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-slate-400 mt-6 font-sans font-medium">
          جميع الحقوق محفوظة © {new Date().getFullYear()} نظام فولتير الفني المشفر
        </p>
      </motion.div>

      {/* Floating PWA Installation Banner */}
      <AnimatePresence>
        {showInstallBanner && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md bg-slate-950 text-white p-5 rounded-3xl shadow-2xl border border-slate-800 z-[200] flex flex-col gap-3 font-sans text-right"
          >
            <div className="flex items-start justify-between gap-3">
              <button 
                onClick={handleDismissBanner}
                className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex-1">
                <h4 className="text-xs font-black text-emerald-400 flex items-center justify-end gap-1.5">
                  <span>تثبيت تطبيق الأندرويد سحابياً</span>
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                </h4>
                <p className="text-[11px] text-slate-300 mt-2 leading-relaxed font-medium">
                  احصل على تجربة سريعة للعمل الميداني والفوترة من هاتفك مباشرة. يدعم التثبيت الفوري كأيقونة تطبيق كاملة على الشاشة الرئيسية للاندرويد.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-1">
              <button
                onClick={handleDismissBanner}
                className="px-3.5 py-2 text-xs text-slate-400 hover:text-white transition-colors font-bold cursor-pointer"
              >
                ليس الآن
              </button>
              <button
                onClick={handleInstallClick}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/10 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تثبيت الآن كـ تطبيق</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
