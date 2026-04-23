import React, { useState, KeyboardEvent, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, Search, Star, BookOpen, Download, Globe, Upload, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store';
import { parseTxtFileWithReport, TxtQualityReport } from '../services/txtParser';

interface BookResult {
  id: number;
  title: string;
  authors: { name: string }[];
  formats: Record<string, string>;
  download_count: number;
}

export function Explore() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [importReport, setImportReport] = useState<{ title: string; report: TxtQualityReport } | null>(null);
  const { addBook, categoryClicks, incrementCategoryClick } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (forcedQuery?: string) => {
    const searchTarget = forcedQuery || query;
    if (!searchTarget.trim()) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`https://gutendex.com/books/?search=${encodeURIComponent(searchTarget)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBrowserSearch = () => {
    if (!query.trim()) return;
    // For manual user search, use "txt下载" suffix
    window.open(`https://www.baidu.com/s?wd=${encodeURIComponent(query + ' txt 下载')}`, '_blank');
  };

  const CATEGORIES = [
    { id: 'cat-1', name: '言情小说', icon: '💕' },
    { id: 'cat-2', name: '悬疑/推理/惊悚', icon: '🕵️' },
    { id: 'cat-3', name: '科幻小说', icon: '🚀' },
    { id: 'cat-4', name: '奇幻/魔幻/玄幻', icon: '🧙' },
    { id: 'cat-5', name: '武侠小说', icon: '⚔️' },
    { id: 'cat-6', name: '历史小说', icon: '📜' },
    { id: 'cat-7', name: '现代/都市小说', icon: '🌆' },
    { id: 'cat-8', name: '重生/穿越', icon: '🔄' },
    { id: 'cat-9', name: '系统官场', icon: '🏛️' },
    { id: 'cat-10', name: '爽文精品', icon: '🔥' },
    { id: 'cat-11', name: '耽美(BL)', icon: '🌈' },
    { id: 'cat-12', name: '古典名著', icon: '🏺' },
  ];

  // Logic for HOT status: top 3 by clicks
  const sortedByHot = [...CATEGORIES].sort((a, b) => (categoryClicks[b.name] || 0) - (categoryClicks[a.name] || 0));
  const hotCategoryNames = sortedByHot.slice(0, 3).map(c => c.name);

  const handleCategoryClick = (catName: string) => {
    incrementCategoryClick(catName);
    const searchQuery = `${catName} 书籍推荐`;
    setQuery(searchQuery);
    handleSearch(searchQuery);
  };

  const handleImportTxt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.toLocaleLowerCase().endsWith('.txt')) {
      setLoading(true);
      try {
        const { book, report } = await parseTxtFileWithReport(file);
        addBook(book);
        setImportReport({ title: book.title, report });
      } catch (err) {
        console.error('Import failed:', err);
        alert('文件解析过程出现严重错误，导入中断。');
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } else if (file) {
      alert('目前仅支持 .txt 格式书籍导入');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-7xl mx-auto px-6 py-8"
    >
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-4xl font-bold text-on-surface tracking-tight mb-4 flex items-center gap-3">
            <Compass className="text-primary" size={32} />
            发现好书
          </h2>
          <p className="text-on-surface-variant font-medium">探索无尽的知识海洋。</p>
        </div>
        
        <div className="flex gap-2">
           <input type="file" accept=".txt" ref={fileInputRef} className="hidden" onChange={handleImportTxt} />
           <button 
             onClick={() => fileInputRef.current?.click()}
             className="px-4 py-2 bg-secondary-container text-on-secondary-container rounded-xl flex items-center gap-2 font-bold text-sm hover:opacity-90 transition-all border border-secondary/10"
           >
              <Upload size={18} /> 导入本地 TXT
           </button>
        </div>
      </div>

      <div className="relative mb-6">
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="搜索全网书籍、作者..."
          className="w-full pl-12 pr-32 py-4 bg-surface-container-lowest border border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl shadow-sm transition-all"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60" size={20} />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
          <button 
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="px-4 py-2 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? '中...' : '搜索'}
          </button>
        </div>
      </div>

      <div className="flex justify-center mb-8">
         <button 
           onClick={handleBrowserSearch}
           disabled={!query.trim()}
           className="flex items-center gap-2 text-sm text-primary font-bold hover:underline disabled:opacity-40 disabled:no-underline"
         >
            <Globe size={16} /> 没搜到？使用外部浏览器进行全网深度搜索
         </button>
      </div>

      <AnimatePresence>
        {hasSearched ? (
          <motion.section 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-12"
          >
            <h3 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
              <Search size={20} className="text-primary" />
              搜索结果
            </h3>
            {loading ? (
              <div className="flex justify-center p-12">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : results.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((b) => (
                  <div key={b.id} className="flex gap-4 p-4 border border-outline-variant/30 rounded-xl bg-surface-container-lowest hover:border-primary/50 transition-all">
                    <div className="w-16 h-24 bg-surface-variant rounded-md overflow-hidden flex-shrink-0">
                      {b.formats['image/jpeg'] ? <img src={b.formats['image/jpeg']} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-primary-container text-on-primary-container text-xs"><BookOpen size={16} /></div>}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col">
                       <h4 className="font-bold text-on-surface text-sm line-clamp-2" title={b.title}>{b.title}</h4>
                       <p className="text-xs text-on-surface-variant mt-1 line-clamp-1">{b.authors.map(a => a.name).join(', ')}</p>
                       <p className="text-[10px] text-outline mt-1">{b.download_count} 次下载</p>
                       <div className="mt-auto pt-2">
                         <button onClick={() => window.open(`https://www.gutenberg.org/ebooks/${b.id}`, '_blank')} className="px-3 py-1.5 flex items-center gap-1 text-xs font-bold bg-primary-container text-on-primary-container rounded-md hover:opacity-90 transition-opacity">
                            <Download size={12} /> 前往下载 / 详情
                         </button>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
               <div className="text-center p-12 text-on-surface-variant">
                  未找到相关书籍，请尝试其他关键词。
               </div>
            )}
          </motion.section>
        ) : (
          <>
            <section className="mb-12">
              <h3 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
                 <Star size={20} className="text-primary" fill="currentColor" />
                 编辑推荐
              </h3>
              <div className="w-full p-8 border border-dashed border-outline-variant/50 rounded-2xl flex flex-col items-center justify-center bg-surface-variant/10">
                 <p className="text-on-surface-variant font-medium">目前编辑无推荐</p>
                 <p className="text-xs text-on-surface-variant/60 mt-2">（管理者后续可通过后端工作台完善此推荐页）</p>
              </div>
            </section>

            <section className="mb-12">
              <h3 className="text-xl font-bold text-on-surface mb-6 flex items-center justify-between">
                <span>分类热榜</span>
                <span className="text-[10px] text-outline font-normal uppercase tracking-widest">点击分类快速探索</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                 {CATEGORIES.map((cat) => {
                    const isHot = hotCategoryNames.includes(cat.name);
                    const clicks = categoryClicks[cat.name] || 0;
                    
                    return (
                      <button 
                        key={cat.id} 
                        onClick={() => handleCategoryClick(cat.name)} 
                        onContextMenu={(e) => {
                          e.preventDefault();
                          window.open(`https://www.baidu.com/s?wd=${encodeURIComponent(cat.name + ' 热门书籍推荐')}`, '_blank');
                        }}
                        className="group relative flex flex-col items-center justify-center p-5 bg-surface-container-low text-on-surface-variant rounded-2xl hover:bg-primary-container/10 hover:text-primary transition-all border border-outline-variant/10 hover:border-primary/20 shadow-sm hover:shadow-md"
                      >
                         {isHot && (
                           <div className="absolute -top-1.5 -right-1.5 px-2 py-0.5 bg-primary text-white text-[9px] font-black rounded-lg shadow-lg z-10 animate-pulse">
                             🔥 HOT {clicks > 0 ? clicks : ''}
                           </div>
                         )}
                         <span className="text-3xl mb-3 group-hover:scale-110 transition-transform">{cat.icon}</span>
                         <span className="text-xs font-bold text-center line-clamp-1">{cat.name}</span>
                      </button>
                    );
                 })}
              </div>
              <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-center gap-3">
                 <Globe size={18} className="text-primary-container shrink-0" />
                 <p className="text-xs text-on-surface-variant leading-relaxed">
                    <span className="font-bold text-primary">搜索指引：</span> 
                    直接点击分类将以“书籍推荐”为词条在站内深度搜索；在上方搜索框输入关键词后，点击外部浏览器搜索将以“TXT下载”为词条全网检索。
                 </p>
              </div>
            </section>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {importReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="absolute inset-0 bg-black/40 backdrop-blur-sm"
               onClick={() => setImportReport(null)}
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative z-10"
            >
               <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between bg-primary/5">
                  <div className="flex items-center gap-3">
                     <CheckCircle2 className="text-primary" size={24} />
                     <div>
                        <h3 className="font-bold text-on-surface">导入成功</h3>
                        <p className="text-xs text-on-surface-variant line-clamp-1">《{importReport.title}》已入库</p>
                     </div>
                  </div>
                  <button onClick={() => setImportReport(null)} className="p-2 hover:bg-surface-variant rounded-full">
                     <X size={20} />
                  </button>
               </div>

               <div className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                     <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20">
                        <p className="text-[10px] text-outline uppercase font-bold tracking-wider mb-1">文件编码</p>
                        <p className="text-sm font-bold text-primary">{importReport.report.encoding.toUpperCase()}</p>
                     </div>
                     <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20">
                        <p className="text-[10px] text-outline uppercase font-bold tracking-wider mb-1">章节识别度</p>
                        <p className="text-sm font-bold text-primary">{Math.round(importReport.report.chapterPatternConfidence * 100)}%</p>
                     </div>
                  </div>

                  {importReport.report.warnings.length > 0 && (
                    <div className="space-y-2">
                       <p className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                          <AlertTriangle size={14} className="text-amber-500" />
                          解析自动修复项
                       </p>
                       <div className="space-y-1">
                          {importReport.report.warnings.map((w, i) => (
                             <div key={i} className="text-[11px] text-on-surface-variant py-1.5 px-3 bg-amber-50 border border-amber-100 rounded-lg">
                                {w}
                             </div>
                          ))}
                       </div>
                    </div>
                  )}

                  <div className="pt-2">
                     <button 
                        onClick={() => setImportReport(null)}
                        className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
                     >
                        进入书架阅读
                     </button>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
