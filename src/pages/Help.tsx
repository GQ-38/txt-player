import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, HelpCircle, MessageSquare, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';

export function Help() {
  const navigate = useNavigate();
  const { user, feedbacks, addFeedback } = useStore();
  const [feedback, setFeedback] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('请先登录后再提交反馈');
      navigate('/auth');
      return;
    }
    
    addFeedback(feedback);
    setFeedback('');
    alert('提交成功！感谢您的反馈，管理人员会尽快处理。');
  };

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
            <HelpCircle className="text-primary" size={24} />
            帮助与反馈
         </h2>
      </div>

      <div className="space-y-8">
         <section>
            <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">常见问题</h3>
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 divide-y divide-outline-variant/10">
               {[
                 { q: '导入 TXT 后出现乱码或识别不正常？', a: '这通常是因为文件编码不常见（推荐使用 UTF-8 编码）。系统已内置编码自动识别及双重扫描去重算法，若仍有异常，建议尝试用记事本打开并“另存为” UTF-8 格式后再次导入。' },
                 { q: '如何导入本地 TXT 文件？', a: '在“书架”页面点击右侧的“导入 TXT”按钮，从您的设备中选择扩展名为 .txt 的文件即可。系统会自动解析文件内容和章节（按照“第X章”等格式）。' },
                 { q: '如何给喜欢的段落划线？', a: '在阅读界面，直接点击你想划线的文本段落，或者长按选择文本（原生支持），随后会弹出底部的划线工具进行高亮保存。' },
                 { q: '支持音量键翻页吗？', a: '支持。在阅读模式下（如果系统与浏览器未拦截），点击设备的音量上下键即可快速向前或向后翻页。如果在水平翻页模式下效果更佳。' }
               ].map((item, i) => (
                  <details key={i} className="group w-full text-left p-4 hover:bg-surface-variant/30 transition-colors cursor-pointer">
                     <summary className="text-sm font-medium flex justify-between items-center list-none outline-none">
                        <span>{item.q}</span>
                        <ExternalLink size={16} className="text-outline group-open:rotate-180 transition-transform" />
                     </summary>
                     <p className="text-xs text-on-surface-variant mt-3 leading-relaxed border-l-2 border-primary/20 pl-3">
                        {item.a}
                     </p>
                  </details>
               ))}
            </div>
         </section>

         <section>
            <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4 flex items-center gap-2">
               <MessageSquare size={16} />
               我的反馈与回复
            </h3>
            <div className="space-y-4 mb-8">
               {feedbacks.length > 0 ? (
                 feedbacks.map(fb => (
                   <div key={fb.id} className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                     <p className="text-sm text-on-surface mb-2 font-medium">{fb.content}</p>
                     <p className="text-[10px] text-on-surface-variant mb-3">您 于 {fb.timestamp} 提交</p>
                     {fb.reply && (
                       <div className="bg-white rounded-lg p-3 text-xs text-on-surface border border-outline-variant/20 relative">
                         <div className="absolute -top-2 left-4 w-3 h-3 bg-white border-l border-t border-outline-variant/20 rotate-45"></div>
                         <span className="font-bold text-primary mr-2">管理者回复:</span>
                         {fb.reply}
                       </div>
                     )}
                   </div>
                 ))
               ) : (
                 <div className="text-center py-6 border border-dashed border-outline-variant rounded-xl text-on-surface-variant text-xs">
                   暂无反馈记录
                 </div>
               )}
            </div>
            
            <form onSubmit={handleSubmit} className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-4">
               <textarea 
                  required
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="请详细描述您遇到的问题或您的宝贵建议..."
                  className="w-full h-32 bg-transparent border-0 focus:ring-0 p-0 text-sm resize-none mb-4"
               />
               <div className="flex justify-end">
                  <button type="submit" className="px-6 py-2 bg-primary text-on-primary rounded-full text-sm font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all">
                     提交反馈
                  </button>
               </div>
            </form>
         </section>
      </div>
    </motion.div>
  );
}
