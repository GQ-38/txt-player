import { motion } from 'motion/react';
import { ArrowLeft, Settings as SettingsIcon, Bell, Moon, BookX, DownloadCloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';

export function Settings() {
  const navigate = useNavigate();
  const { followSystemTheme, setFollowSystemTheme } = useStore();

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-3xl mx-auto px-6 py-8"
    >
      <div className="flex items-center gap-4 mb-8">
         <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-surface-variant transition-colors text-on-surface">
            <ArrowLeft size={24} />
         </button>
         <h2 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            <SettingsIcon className="text-primary" size={24} />
            应用设置
         </h2>
      </div>

      <div className="space-y-6">
         <section>
            <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">阅读偏好</h3>
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 divide-y divide-outline-variant/10">
               <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <Moon size={20} className="text-outline" />
                     <div className="flex flex-col">
                        <span className="text-sm font-medium">跟随系统深色模式</span>
                        <span className="text-[10px] text-on-surface-variant opacity-70">开启后全局配色将随阅读页背景同步切换</span>
                     </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={followSystemTheme} 
                    onChange={e => setFollowSystemTheme(e.target.checked)}
                    className="toggle-checkbox w-10 h-5 accent-primary cursor-pointer" 
                  />
               </div>
               <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <BookX size={20} className="text-outline" />
                     <span className="text-sm font-medium">翻页动画</span>
                  </div>
                  <input type="checkbox" defaultChecked className="toggle-checkbox w-10 h-5" />
               </div>
            </div>
         </section>

         <section>
            <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">数据与存储</h3>
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 divide-y divide-outline-variant/10">
               <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <DownloadCloud size={20} className="text-outline" />
                     <span className="text-sm font-medium">自动同步阅读进度</span>
                  </div>
                  <input type="checkbox" defaultChecked className="toggle-checkbox w-10 h-5" />
               </div>
               <button className="w-full text-left p-4 flex items-center justify-between hover:bg-surface-variant/30 transition-colors">
                  <span className="text-sm font-medium text-error">清除本地缓存</span>
                  <span className="text-xs text-outline">120 MB</span>
               </button>
            </div>
         </section>

         <section>
            <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">通知</h3>
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20">
               <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <Bell size={20} className="text-outline" />
                     <span className="text-sm font-medium">每日阅读提醒</span>
                  </div>
                  <input type="checkbox" className="toggle-checkbox w-10 h-5" />
               </div>
            </div>
         </section>
      </div>
    </motion.div>
  );
}
