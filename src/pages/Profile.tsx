import { Edit3, History, Settings, HelpCircle, ChevronRight, LogOut, UserCircle, X, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import React, { useState, useRef } from 'react';
import { uploadImage } from '../services/uploadService';
import { ACHIEVEMENT_LEVELS } from '../constants';

export function Profile() {
  const navigate = useNavigate();
  const { user, logout, updateUser, getUserTitle, books } = useStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  const [showAchievements, setShowAchievements] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const averageProgress = books.length > 0 
    ? Math.round(books.reduce((acc, b) => acc + (b.progress || 0), 0) / books.length) 
    : 0;

  const stats = [
    { label: '阅读时长(时)', value: user ? (user.stats.readingTimeMinutes / 60).toFixed(1) : 0, onClick: () => setShowAchievements(true) },
    { label: '阅读进度', value: user ? `${averageProgress}%` : '0%', path: '/history' as string | null },
    { label: '连续打卡(天)', value: user?.stats.consecutiveDays || 0, path: '/check-in' as string | null },
  ];

  const menuItems = [
    { icon: Edit3, label: '我的笔记', path: '/library' },
    { icon: History, label: '阅读历史', path: '/history' },
    { icon: Settings, label: '应用设置', path: '/settings' },
    { icon: HelpCircle, label: '帮助与反馈', path: '/help' },
  ];

  const handleShareApp = () => {
    if (navigator.share) {
      navigator.share({
        title: '避风港书屋',
        text: '我正在使用「避风港书屋」沉浸阅读，你也来看看吧！',
        url: window.location.origin
      });
    } else {
      alert('分享链接已复制到剪贴板！');
    }
  };

  const handleNameSave = () => {
    if (editedName.trim() && editedName !== user?.name) {
      updateUser({ name: editedName });
    }
    setIsEditingName(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const publicUrl = await uploadImage(file, 'avatar');
        await updateUser({ avatarUrl: publicUrl });
      } catch (error) {
        alert(error instanceof Error ? error.message : '头像上传失败');
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-3xl mx-auto px-6 pt-8 pb-32"
    >
      <section className="flex flex-col items-center mb-12">
        {user ? (
          <>
            <div className="relative mb-6">
              <div 
                className="w-28 h-28 rounded-full overflow-hidden border-2 border-primary/10 shadow-ambient bg-surface-variant flex items-center justify-center cursor-pointer group"
                onClick={() => avatarInputRef.current?.click()}
              >
                <img 
                  src={user.avatarUrl} 
                  alt="Avatar"
                  className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <Edit3 size={24} className="text-white drop-shadow-md" />
                </div>
              </div>
              <input type="file" accept="image/*" ref={avatarInputRef} className="hidden" onChange={handleAvatarChange} />
              <div className="absolute -inset-2 bg-primary/5 rounded-full blur-xl -z-10" />
            </div>
            
            {isEditingName ? (
              <div className="flex items-center justify-center mb-1 w-full max-w-[200px] relative">
                <input 
                  autoFocus
                  type="text" 
                  value={editedName} 
                  onChange={e => setEditedName(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={e => e.key === 'Enter' && handleNameSave()}
                  className="text-2xl font-bold text-center bg-surface-container border border-outline-variant rounded px-2 w-full focus:border-primary outline-none"
                />
              </div>
            ) : (
              <div className="relative flex justify-center items-center group w-full max-w-[200px]">
                <h2 className="text-2xl font-bold text-on-surface cursor-pointer" onClick={() => { setEditedName(user.name); setIsEditingName(true); }}>
                   {user.name}
                </h2>
                <div className="absolute -right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => { setEditedName(user.name); setIsEditingName(true); }} className="p-1 text-outline hover:text-primary">
                     <Edit3 size={16} />
                   </button>
                </div>
              </div>
            )}
            
            <p className="text-sm text-primary font-bold mt-1 bg-primary/10 px-3 py-1 rounded-full">{getUserTitle()}</p>
          </>
        ) : (
           <>
              <div className="relative mb-6">
                 <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-primary/10 shadow-ambient bg-surface-variant flex items-center justify-center text-on-surface-variant/40">
                    <UserCircle size={64} strokeWidth={1} />
                 </div>
              </div>
              <h2 className="text-2xl font-bold text-on-surface mb-2">避风港的旅人</h2>
              <button onClick={() => navigate('/auth')} className="px-6 py-2 bg-primary text-on-primary rounded-full text-sm font-bold shadow-sm hover:opacity-90 transition-all">登录 / 注册</button>
           </>
        )}
      </section>

      {/* Stats Bento Grid */}
      <section className="grid grid-cols-3 gap-4 mb-12">
        {stats.map((stat) => (
          <div 
            key={stat.label} 
            onClick={() => {
              if ('path' in stat && stat.path) navigate(stat.path);
              if ('onClick' in stat && stat.onClick) stat.onClick();
            }}
            className={`bg-white rounded-2xl p-6 flex flex-col items-center justify-center border border-primary/5 shadow-premium text-center transition-transform active:scale-95 ${('path' in stat && stat.path) || ('onClick' in stat) ? 'cursor-pointer hover:border-primary/20' : ''}`}
          >
             <span className="text-3xl font-bold text-primary tracking-tight">{user ? stat.value : '-'}</span>
             <span className="text-[10px] text-on-surface-variant font-bold mt-2 uppercase tracking-tight">{stat.label}</span>
          </div>
        ))}
      </section>

      <AnimatePresence>
        {showAchievements && (
           <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setShowAchievements(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden relative z-10"
              >
                <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between bg-primary-container/10">
                   <div className="flex items-center gap-2">
                      <Award className="text-primary" size={20} />
                      <h3 className="font-bold text-lg">成就等级</h3>
                   </div>
                   <button onClick={() => setShowAchievements(false)} className="p-2 hover:bg-surface-variant rounded-full">
                      <X size={20} />
                   </button>
                </div>
                
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                   {ACHIEVEMENT_LEVELS.map((level) => {
                      const userHours = (user?.stats.readingTimeMinutes || 0) / 60;
                      const isUnlocked = userHours >= level.minHours;
                      return (
                         <div key={level.title} className={`p-4 rounded-2xl border transition-all ${isUnlocked ? 'border-primary/20 bg-primary/5' : 'border-outline-variant/20 bg-surface-variant/5 opacity-60'}`}>
                            <div className="flex items-center justify-between mb-2">
                               <div className="flex items-center gap-3">
                                  <span className="text-2xl">{level.icon}</span>
                                  <span className={`font-bold ${isUnlocked ? 'text-primary' : 'text-outline'}`}>{level.title}</span>
                               </div>
                               <span className="text-xs font-bold text-outline-variant">{level.minHours}h+</span>
                            </div>
                            <p className="text-xs text-on-surface-variant leading-relaxed">{level.description}</p>
                         </div>
                      );
                   })}
                </div>
                
                <div className="p-6 bg-surface-container-lowest text-center">
                   <p className="text-xs text-on-surface-variant font-medium">当前阅读时长：<span className="text-primary font-bold">{((user?.stats.readingTimeMinutes || 0) / 60).toFixed(1)}</span> 小时</p>
                </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      {/* Menu Options */}
      <section className="space-y-3">
        {menuItems.map((item) => (
          <button 
            key={item.label}
            onClick={() => navigate(item.path)}
            className="w-full group flex items-center justify-between p-5 bg-white rounded-2xl border border-primary/5 shadow-premium hover:border-primary/20 transition-all duration-300 active:scale-98"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary-container text-on-secondary-container rounded-xl">
                 <item.icon size={20} />
              </div>
              <span className="text-base font-bold text-on-surface">{item.label}</span>
            </div>
            <ChevronRight size={18} className="text-outline group-hover:text-primary transition-colors" />
          </button>
        ))}

        <button 
          onClick={handleShareApp}
          className="w-full group flex items-center justify-between p-5 bg-white rounded-2xl border border-primary/5 shadow-premium hover:border-primary/20 transition-all duration-300 active:scale-98"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-secondary-container text-on-secondary-container rounded-xl">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
            </div>
            <span className="text-base font-bold text-on-surface">分享软件</span>
          </div>
          <ChevronRight size={18} className="text-outline group-hover:text-primary transition-colors" />
        </button>

        {user && (
          <button 
            onClick={() => logout()}
            className="w-full group flex items-center justify-between p-5 bg-error-container/20 text-error rounded-2xl border border-error/10 shadow-premium hover:bg-error-container/40 transition-all duration-300 active:scale-98 mt-8"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-error-container rounded-xl">
                 <LogOut size={20} />
              </div>
              <span className="text-base font-bold">退出登录</span>
            </div>
          </button>
        )}
      </section>
    </motion.div>
  );
}
