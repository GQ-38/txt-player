import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, ArrowRight, KeyRound, MessageSquareMore } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';

function looksLikePhone(value: string) {
  const trimmed = value.trim();
  return /^\+?[\d\s()-]{7,20}$/.test(trimmed) && !trimmed.includes('@');
}

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<'password' | 'otp'>('password');
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, requestLoginOtp, verifyLoginOtp } = useStore();

  const identifierLabel = useMemo(() => looksLikePhone(identifier) ? '手机号码' : '电子邮箱', [identifier]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && password !== confirmPassword) {
      alert('两次输入的密码不一致');
      return;
    }
    setLoading(true);
    const result = await login(identifier, password, isLogin ? 'signin' : 'signup', name || undefined);
    setLoading(false);
    if (!result.success) {
      alert(result.requiresConfirmation ? '注册成功，请先完成邮箱或短信验证，再使用验证码或密码登录。' : (result.error || (isLogin ? '登录失败' : '注册失败')));
      return;
    }
    navigate('/profile');
  };

  const handleRequestOtp = async () => {
    setLoading(true);
    const result = await requestLoginOtp(identifier);
    setLoading(false);
    if (!result.success) {
      alert(result.error || '验证码发送失败');
      return;
    }
    setOtpSent(true);
    alert(`验证码已发送到${identifierLabel === '手机号码' ? '手机短信' : '邮箱'}，请注意查收。`);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await verifyLoginOtp(identifier, otp);
    setLoading(false);
    if (!result.success) {
      alert(result.error || '验证码校验失败');
      return;
    }
    navigate('/profile');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-surface-bright flex items-center justify-center relative overflow-hidden font-sans"
    >
      <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center opacity-30 mix-blend-multiply">
        <div className="w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-primary-container/20 to-surface-bright blur-3xl"></div>
      </div>

      <main className="z-10 w-full max-w-[420px] px-6">
        <div className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-xl p-8 shadow-ambient border border-outline-variant/20 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-container/10 to-transparent"></div>

          <div className="flex justify-between items-center mb-8">
             <button onClick={() => navigate(-1)} className="text-on-surface-variant text-sm hover:text-primary transition-colors">取消</button>
             <span className="text-xs font-bold text-outline uppercase tracking-wider">{isLogin ? '登录' : '注册'}</span>
          </div>

          <div className="flex flex-col items-center mb-8">
            <BookOpen className="text-primary w-12 h-12 mb-4" />
            <h1 className="text-3xl font-bold text-primary text-center">避风港书屋</h1>
            <p className="text-sm text-on-surface-variant text-center mt-2">支持邮箱密码、邮箱验证码、手机验证码登录。</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-6 rounded-xl bg-surface-variant/40 p-1">
            <button
              type="button"
              onClick={() => { setAuthMethod('password'); setOtpSent(false); }}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${authMethod === 'password' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant'}`}
            >
              <KeyRound size={16} /> 密码
            </button>
            <button
              type="button"
              onClick={() => setAuthMethod('otp')}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${authMethod === 'otp' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant'}`}
            >
              <MessageSquareMore size={16} /> 验证码
            </button>
          </div>

          {authMethod === 'password' ? (
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-5">
              {!isLogin && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">昵称</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="给自己起个名字"
                    className="bg-surface-container-low text-on-surface text-base px-4 py-3 rounded-t border-0 border-b border-outline-variant focus:ring-0 focus:border-b-0 focus:border focus:border-primary focus:bg-surface-container-lowest focus:rounded transition-all duration-200"
                  />
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">电子邮箱 / 手机号码</label>
                <input 
                  type="text" 
                  required
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="请输入邮箱或手机号（手机号建议带国家区号）"
                  className="bg-surface-container-low text-on-surface text-base px-4 py-3 rounded-t border-0 border-b border-outline-variant focus:ring-0 focus:border-b-0 focus:border focus:border-primary focus:bg-surface-container-lowest focus:rounded transition-all duration-200"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">密码</label>
                <input 
                  type="password" 
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="至少 6 位"
                  className="bg-surface-container-low text-on-surface text-base px-4 py-3 rounded-t border-0 border-b border-outline-variant focus:ring-0 focus:border-b-0 focus:border focus:border-primary focus:bg-surface-container-lowest focus:rounded transition-all duration-200"
                />
              </div>

              {!isLogin && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">确认密码</label>
                  <input 
                    type="password" 
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="再次输入密码"
                    className="bg-surface-container-low text-on-surface text-base px-4 py-3 rounded-t border-0 border-b border-outline-variant focus:ring-0 focus:border-b-0 focus:border focus:border-primary focus:bg-surface-container-lowest focus:rounded transition-all duration-200"
                  />
                </div>
              )}

              <button disabled={loading} type="submit" className="mt-2 bg-primary text-on-primary text-sm font-bold uppercase tracking-widest py-4 px-6 rounded-full shadow-sm hover:bg-tertiary-container hover:shadow-md transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70">
                <span>{loading ? '提交中...' : isLogin ? '进入图书馆' : '创建账户'}</span>
                <ArrowRight size={18} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">电子邮箱 / 手机号码</label>
                <input 
                  type="text" 
                  required
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="手机号建议填写 +86xxxxxxxxxxx"
                  className="bg-surface-container-low text-on-surface text-base px-4 py-3 rounded-t border-0 border-b border-outline-variant focus:ring-0 focus:border-b-0 focus:border focus:border-primary focus:bg-surface-container-lowest focus:rounded transition-all duration-200"
                />
              </div>

              {otpSent && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">验证码</label>
                  <input 
                    type="text" 
                    required
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="请输入收到的验证码"
                    className="bg-surface-container-low text-on-surface text-base px-4 py-3 rounded-t border-0 border-b border-outline-variant focus:ring-0 focus:border-b-0 focus:border focus:border-primary focus:bg-surface-container-lowest focus:rounded transition-all duration-200"
                  />
                </div>
              )}

              {!otpSent ? (
                <button disabled={loading} type="button" onClick={handleRequestOtp} className="mt-2 bg-primary text-on-primary text-sm font-bold uppercase tracking-widest py-4 px-6 rounded-full shadow-sm hover:bg-tertiary-container hover:shadow-md transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70">
                  <span>{loading ? '发送中...' : '发送验证码'}</span>
                  <ArrowRight size={18} />
                </button>
              ) : (
                <>
                  <button disabled={loading} type="submit" className="mt-2 bg-primary text-on-primary text-sm font-bold uppercase tracking-widest py-4 px-6 rounded-full shadow-sm hover:bg-tertiary-container hover:shadow-md transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70">
                    <span>{loading ? '登录中...' : '验证码登录'}</span>
                    <ArrowRight size={18} />
                  </button>
                  <button type="button" onClick={handleRequestOtp} className="text-sm text-primary font-bold hover:underline">重新发送验证码</button>
                </>
              )}
            </form>
          )}

          <div className="mt-8 text-center">
            <p className="text-sm text-on-surface-variant">
              {isLogin ? '第一次来到避风港？' : '已有账户？'} 
              <button 
                 type="button" 
                 onClick={() => setIsLogin(!isLogin)}
                 className="text-sm font-bold text-primary ml-1 hover:underline underline-offset-4 decoration-primary/30 transition-all"
              >
                 {isLogin ? '创建账户' : '立即登录'}
              </button>
            </p>
          </div>
        </div>
      </main>
    </motion.div>
  );
}
