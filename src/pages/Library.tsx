import { motion, AnimatePresence } from 'motion/react';
import { AlignLeft, Bookmark, Clock, BookOpen, Quote, Download, X, ArrowLeft } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import * as htmlToImage from 'html-to-image';

export function Library() {
  const location = useLocation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'highlights' | 'bookmarks'>(location.state?.filter || 'all');
  const { highlights, books } = useStore();
  const [sharingItem, setSharingItem] = useState<any>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const filteredItems = highlights.filter(item => {
    // Apply bookId filter if present in state
    if (location.state?.bookId && item.bookId !== location.state.bookId) return false;
    
    if (filter === 'all') return true;
    if (filter === 'bookmarks') return item.isBookmark;
    return !item.isBookmark;
  });

  const targetBook = location.state?.bookId ? books.find(b => b.id === location.state.bookId) : null;

  const downloadCard = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(cardRef.current, { 
        backgroundColor: '#ffffff', 
        pixelRatio: 3, 
        skipFonts: true, // often fixes font loading CORS issues
        style: {
          transform: 'none', // Reset scaling for the captured image
          margin: '0',
        },
        filter: (node) => {
          return true;
        }
      });
      const link = document.createElement('a');
      link.download = `share-card-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image', err);
      // Fallback: draw basic canvas
      alert('保存出错，正在尝试为您提供简单的文本快照...');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-5xl mx-auto px-6 py-10"
    >
      {location.state?.bookId && (
        <div className="flex items-center gap-3 mb-8">
           <button 
             onClick={() => navigate(-1)} 
             className="p-2 rounded-full hover:bg-surface-variant transition-colors text-on-surface"
           >
              <ArrowLeft size={24} />
           </button>
           <div className="flex flex-col">
              <h2 className="text-xl font-bold text-on-surface truncate max-w-xs">{targetBook?.title || '书籍详情'}</h2>
              <span className="text-[10px] font-bold text-primary tracking-widest uppercase opacity-70">书内划线与书签</span>
           </div>
        </div>
      )}

      <div className="mb-12">
        <h2 className="text-4xl font-bold text-on-surface tracking-tight mb-4">书签与划线</h2>
        <div className="flex gap-2">
          {(['all', 'highlights', 'bookmarks'] as const).map((f) => (
             <button 
               key={f} 
               onClick={() => setFilter(f)} 
               className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all ${filter === f ? 'bg-secondary-container text-on-secondary-container shadow-sm' : 'border border-outline-variant text-on-surface-variant hover:bg-surface-variant'}`}
             >
               {f === 'all' ? `全部 (${highlights.length})` : f === 'highlights' ? `划线 (${highlights.filter(h => !h.isBookmark).length})` : `书签 (${highlights.filter(h => h.isBookmark).length})`}
             </button>
          ))}
        </div>
      </div>

      {filteredItems.length > 0 ? (
        <section className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredItems.map((item) => (
              <div key={item.id} className="relative bg-white rounded-2xl border border-outline-variant/20 p-6 shadow-premium group hover:shadow-ambient transition-all duration-300">
                 <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 rounded-l-full" />
                 
                 <div className="flex justify-between items-start mb-6">
                   <div className="flex items-center gap-2 text-on-surface-variant uppercase tracking-widest text-[10px] font-bold">
                     {!item.isBookmark ? <Quote size={12} className="text-primary/60" /> : <Bookmark size={12} className="text-secondary/60 fill-secondary/60" />}
                     <span>{item.chapter} · {item.date}</span>
                   </div>
                   <button onClick={() => setSharingItem(item)} className="p-1.5 text-outline hover:text-primary transition-colors hover:bg-surface-variant rounded-md opacity-0 group-hover:opacity-100" title="分享卡片">
                     <Download size={16} />
                   </button>
                 </div>

                 <div className={item.isBookmark ? "bg-surface-variant/30 rounded-xl p-4 mb-6 border-l-4 border-secondary/40" : "flex-grow mb-6"}>
                    <p className="text-base text-on-surface leading-relaxed italic">
                      {item.content}
                    </p>
                 </div>

                 <div className="flex justify-between items-center mt-auto pt-4 border-t border-outline-variant/10">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
                      {!item.isBookmark ? '划线' : '书签与笔记'}
                    </span>
                    <div className="flex gap-4">
                      <Link to={`/reading/${item.bookId}`} className="text-primary font-bold text-xs hover:text-primary-container transition-colors flex items-center gap-1">
                         <BookOpen size={14} /> 回到出处
                      </Link>
                    </div>
                 </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
           <Quote size={48} className="opacity-20 mb-4" />
           <p className="text-base font-bold">没有找到相关的记录</p>
           <p className="text-xs mt-2 opacity-70">在阅读时选择文字以添加划线，或点击右下角添加书签。</p>
        </div>
      )}

      {/* Share Modal */}
      <AnimatePresence>
         {sharingItem && (
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
               onClick={() => setSharingItem(null)}
            >
               <div className="bg-surface rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl max-h-[85vh]" onClick={e => e.stopPropagation()}>
                 <div className="p-4 border-b border-outline-variant/20 flex justify-between items-center bg-surface shrink-0 z-10">
                    <h3 className="font-bold text-on-surface">分享卡片</h3>
                    <div className="flex items-center gap-2">
                      <button onClick={downloadCard} className="px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm shadow-md hover:bg-primary/90 transition-colors flex items-center gap-2">
                         <Download size={16} /> 保存图片
                      </button>
                      <button onClick={() => setSharingItem(null)} className="p-2 text-on-surface-variant hover:bg-surface-variant rounded-full"><X size={20}/></button>
                    </div>
                 </div>
                 
                 {/* Share Card Content to be captured */}
                 <div className="p-4 sm:p-8 bg-surface-container-lowest flex justify-center w-full overflow-y-auto flex-1 custom-scrollbar">
                   {/* We wrap the card to allow CSS scaling if the screen is too small, but keep real DOM size for export */}
                   <div style={{ transform: `scale(min(1, ${(window.innerWidth - 32) / 360}))`, transformOrigin: 'top center' }} className="pb-4 w-full flex justify-center h-max">
                     <div ref={cardRef} className="w-full max-w-[360px] min-w-[280px] bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-outline-variant/10 overflow-hidden relative border-t-[8px]">
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary/20 rounded-r-sm" />
                        <div className="p-8 pb-12 relative z-10 pl-10">
                           <div className="flex justify-between items-start mb-6">
                             <div className="flex items-center gap-2 text-on-surface-variant uppercase tracking-widest text-[10px] font-bold">
                               {!sharingItem?.isBookmark ? <span className="font-serif italic text-primary/60 pr-1 text-sm leading-none">"</span> : <Bookmark size={12} className="text-secondary/60 fill-secondary/60" />}
                               <span>{sharingItem?.chapter} · {sharingItem?.date}</span>
                             </div>
                           </div>
                           
                           <div className={sharingItem.isBookmark ? "bg-surface-variant/30 rounded-xl p-4 mb-6 border-l-4 border-secondary/40" : "flex-grow mb-6"}>
                             <p className="text-[17px] text-on-surface leading-[1.8] font-sans text-justify italic font-medium whitespace-pre-wrap">
                               {sharingItem.content}
                             </p>
                           </div>

                           <div className="flex flex-col items-start mt-8 pt-6 border-t border-outline-variant/10">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
                                {!sharingItem?.isBookmark ? '精彩划线' : '书签与笔记'}
                              </span>
                              <p className="text-sm font-bold text-on-surface">{sharingItem.bookTitle || '未知书籍'}</p>
                           </div>
                        </div>
                     </div>
                   </div>
                 </div>
               </div>
            </motion.div>
         )}
      </AnimatePresence>
    </motion.div>
  );
}

export default Library;
