import { ArrowLeft, MoreVertical, Play, Pause, FastForward, Rewind, Settings as SettingsIcon, List as ListIcon, Bookmark, Mic, BookOpen, Highlighter, X, Clock, Navigation, MousePointerClick, Volume2, SkipBack, SkipForward, FileText, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { MOCK_CHAPTERS } from '../constants';

export function ReadingView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { books, addHighlight, removeHighlightByContent, highlights, theme, setTheme } = useStore();
  
  const [isUIVisible, setIsUIVisible] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPlayer, setShowPlayer] = useState(location.state?.showPlayer || false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  
  // Clear the state so it doesn't persist on refresh
  useEffect(() => {
     if (location.state?.showPlayer) {
        window.history.replaceState({}, document.title);
     }
  }, [location]);
  
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [fontFamily, setFontFamily] = useState<'font-sans' | 'font-serif' | 'font-kai'>('font-sans');
  const [scrollMode, setScrollMode] = useState<'vertical' | 'horizontal'>('vertical');
  const [isAutoScroll, setIsAutoScroll] = useState(false);
  
  const [highlightCtx, setHighlightCtx] = useState<{ text: string, x: number, y: number } | null>(null);
  const [removeHighlightCtx, setRemoveHighlightCtx] = useState<{ text: string, x: number, y: number } | null>(null);
  
  // Audio / TTS states
  const { ttsState, setTtsState } = useStore();
  const { isPlaying, activeParagraphIdx, currentChapterIndex, rate: ttsRateState, voice: selectedVoice } = ttsState;

  const setIsPlaying = (playing: boolean) => setTtsState({ isPlaying: playing });
  const setActiveParagraphIdx = (idx: number) => setTtsState({ activeParagraphIdx: idx });
  const setCurrentChapterIndex = (idx: number) => setTtsState({ currentChapterIndex: idx });
  const setTtsRateState = (r: number) => setTtsState({ rate: r });
  const setSelectedVoice = (v: string) => setTtsState({ voice: v });

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [ttsTimerMinutes, setTtsTimerMinutes] = useState(0);
  const synth = window.speechSynthesis;
  const ttsRateRef = useRef(ttsRateState);

  const articleRef = useRef<HTMLElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const [pullDistance, setPullDistance] = useState(0);
  const touchStartYRef = useRef(0);
  const touchStartXRef = useRef(0);

  const progressRef = useRef<HTMLDivElement>(null);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);

  const handleProgressInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (!progressRef.current || paragraphs.length === 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newIdx = Math.floor(pos * (paragraphs.length - 1));
    setActiveParagraphIdx(newIdx);
    if (isPlaying) playParagraph(newIdx);
  };

  const book = books.find(b => b.id === id);

  // Auto-restore progress on mount if needed
  useEffect(() => {
    if (book && book.chapters && book.chapters.length > 0) {
      // Approximate chapter index from progress percentage
      const targetIndex = Math.floor((book.progress / 100) * book.chapters.length);
      const safeIndex = Math.max(0, Math.min(targetIndex, book.chapters.length - 1));
      if (safeIndex !== currentChapterIndex) {
        setCurrentChapterIndex(safeIndex);
      }
    }
  }, [book?.id]);

  const { updateBook } = useStore();
  const lastSavedProgress = useRef(book?.progress || 0);

  const saveProgress = () => {
    if (!book || !scrollContainerRef.current) return;
    const scroller = scrollContainerRef.current;
    let scrollPercent = 0;
    
    if (scrollMode === 'vertical') {
      scrollPercent = (scroller.scrollTop / Math.max(1, scroller.scrollHeight - scroller.clientHeight)) * 100;
    } else {
      scrollPercent = (scroller.scrollLeft / Math.max(1, scroller.scrollWidth - scroller.clientWidth)) * 100;
    }

    const chapters = book.chapters && book.chapters.length > 0 ? book.chapters : [];
    let totalProgress = scrollPercent;

    if (chapters.length > 0) {
      const chapterWeight = 100 / chapters.length;
      totalProgress = (currentChapterIndex * chapterWeight) + (scrollPercent * chapterWeight / 100);
    }

    const finalProgress = Math.min(100, Math.max(0, Math.round(totalProgress * 10) / 10));
    
    if (Math.abs(finalProgress - lastSavedProgress.current) > 0.5) {
      updateBook(book.id, { progress: finalProgress });
      lastSavedProgress.current = finalProgress;
    }
  };

  // Scroll listener for progress
  useEffect(() => {
    const scroller = scrollContainerRef.current;
    if (!scroller) return;

    let timeoutId: number;
    const handleScroll = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(saveProgress, 500);
    };

    scroller.addEventListener('scroll', handleScroll);
    return () => {
      scroller.removeEventListener('scroll', handleScroll);
      window.clearTimeout(timeoutId);
      saveProgress(); // Final save on cleanup
    };
  }, [currentChapterIndex, scrollMode, book?.id]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const scroller = scrollContainerRef.current;
    if (!scroller) return;

    if (scrollMode === 'vertical' && scroller.scrollTop <= 0) {
      const distance = e.touches[0].clientY - touchStartYRef.current;
      if (distance > 0) {
        setPullDistance(distance);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (pullDistance > 80) {
      toggleBookmark();
    }
    setPullDistance(0);

    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Horizontal pagination swipe
    if (scrollMode === 'horizontal' && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      const scroller = scrollContainerRef.current;
      if (scroller) {
        const stride = window.innerWidth;
        scroller.scrollBy({ left: deltaX < 0 ? stride : -stride, behavior: 'smooth' });
      }
    }
  };

  if (!book) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center text-on-surface-variant z-50 fixed inset-0">
         <p className="mb-4">找不到该书籍，或书架为空。</p>
         <button onClick={() => navigate('/')} className="px-6 py-2 bg-primary text-white rounded-full">返回书架</button>
      </div>
    );
  }

  const chaptersToUse = (book.chapters && book.chapters.length > 0 ? book.chapters : MOCK_CHAPTERS)
    .filter((ch, idx, self) => {
      // Safety filter: remove empty chapters and visually detect duplicates if they leaked through parsing
      if (!ch.content || ch.content.trim().length === 0) return false;
      const titleNorm = ch.title.replace(/\s+/g, '');
      const firstIdx = self.findIndex(c => c.title.replace(/\s+/g, '') === titleNorm);
      // If this is a duplicate title, only keep the one with longer content
      if (firstIdx !== idx) {
         return ch.content.length > self[firstIdx].content.length;
      }
      return true;
    });
  const currentChapter = chaptersToUse[currentChapterIndex] || chaptersToUse[0];

  const contentStr = currentChapter?.content || book.content || '光线穿过那些高耸的穹顶，洒在地面的大理石上，形成一片片斑驳的亮影。\n在这个被称为“圣所”的地方，连呼吸似乎都变得轻盈。周围没有机器的轰鸣，没有人群的喧嚣，只有偶尔从远处传来的微风拂过石柱的低吟。';
  const paragraphs = contentStr.split('\n').filter(p => p.trim());

  useEffect(() => {
     setTtsState({ paragraphs, bookId: book.id });
  }, [currentChapterIndex, book.id]);

  useEffect(() => {
     ttsRateRef.current = ttsRateState;
  }, [ttsRateState]);

  const bgColor = theme === 'day' ? 'bg-[#FCF9F8]' : theme === 'eye' ? 'bg-[#F8F5EE]' : 'bg-[#1B1C1C]';
  const textColor = theme === 'night' ? 'text-[#DCD9D9]' : 'text-[#2C2C2C]';

  // Highlight selection logic
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.toString().trim().length === 0) {
        setHighlightCtx(null);
        return;
      }
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setHighlightCtx({ text: selection.toString().trim(), x: rect.left + rect.width / 2, y: rect.top });
    };
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleSaveHighlight = () => {
    if (highlightCtx) {
      addHighlight({
        id: 'hl-' + Date.now(),
        bookId: book.id,
        bookTitle: book.title,
        content: highlightCtx.text,
        chapter: currentChapter.title,
        date: new Date().toLocaleDateString('zh-CN'),
      });
      setHighlightCtx(null);
      window.getSelection()?.removeAllRanges();
      alert('已添加划线笔记！');
    }
  };

  const currentBookmark = book && highlights.find(h => h.bookId === book.id && h.isBookmark && h.chapter === currentChapter?.title);
  const isBookmarked = !!currentBookmark;

  const toggleBookmark = () => {
    if (isBookmarked && currentBookmark) {
       removeHighlightByContent(currentBookmark.content, book.id);
       alert('已取消书签！');
    } else if (book) {
       addHighlight({ id: 'bm-' + Date.now(), bookId: book.id, bookTitle: book.title, content: '网页进度书签', chapter: currentChapter.title, date: new Date().toLocaleDateString('zh-CN'), isBookmark: true });
       alert('已保存书签！');
    }
  };

  const handleArticleClick = (e: React.MouseEvent) => {
    if (highlightCtx || removeHighlightCtx) {
      setHighlightCtx(null);
      setRemoveHighlightCtx(null);
      window.getSelection()?.removeAllRanges();
      return;
    }
    const selection = window.getSelection();
    if (selection && selection.toString().trim() !== '') {
       return; // Prevent UI toggle if user is selecting text
    }
    // Prevent UI toggle if clicking a paragraph while in a playing TTS state to allow sentence jumping
    if ((isPlaying || showPlayer) && (e.target as HTMLElement).tagName === 'P') {
      return;
    }
    setIsUIVisible(!isUIVisible);
  };

  const handleParagraphClick = (idx: number) => {
    if (isPlaying || showPlayer) {
      setActiveParagraphIdx(idx);
      playParagraph(idx);
    }
  };

  // Keyboard pagination mapping (Volume keys simulation + arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSettings || showChapters || showPlayer) return;
      const scroller = scrollContainerRef.current;
      if (!scroller) return;
      
      const scrollAmt = scrollMode === 'horizontal' ? window.innerWidth : window.innerHeight * 0.8;
      
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'AudioVolumeDown') {
        e.preventDefault();
        scroller.scrollBy({ [scrollMode === 'horizontal' ? 'left' : 'top']: scrollAmt, behavior: 'smooth' });
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'AudioVolumeUp') {
        e.preventDefault();
        scroller.scrollBy({ [scrollMode === 'horizontal' ? 'left' : 'top']: -scrollAmt, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scrollMode, showSettings, showChapters, showPlayer]);

  // Auto Scroll Engine
  useEffect(() => {
    if (isAutoScroll && !showPlayer && !isUIVisible && scrollMode === 'vertical') {
      const interval = setInterval(() => {
         scrollContainerRef.current?.scrollBy({ top: 1, behavior: 'auto' });
      }, 30);
      return () => clearInterval(interval);
    }
  }, [isAutoScroll, showPlayer, isUIVisible, scrollMode]);

  // TTS Engine
  useEffect(() => {
    const loadVoices = () => {
      const v = synth.getVoices().filter(voice => voice.lang.includes('zh'));
      setVoices(v);
      if (v.length > 0 && !selectedVoice) setSelectedVoice(v[0].name);
    };
    loadVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }
    // Intentionally omitting synth.cancel() on unmount to support background playback of the current chapter
  }, []);

  const playParagraph = (idx: number) => {
    synth.cancel();
    if (idx >= paragraphs.length) {
       setIsPlaying(false);
       return;
    }
    const text = paragraphs[idx];
    const u = new SpeechSynthesisUtterance(text);
    if (selectedVoice) {
      const voice = voices.find(v => v.name === selectedVoice);
      if (voice) u.voice = voice;
    }
    u.rate = ttsRateRef.current;
    u.pitch = 1.0;
    
    u.onend = () => {
       if (isPlaying) {
          setActiveParagraphIdx(idx + 1);
          playParagraph(idx + 1);
       }
    };
    u.onerror = (e) => {
       console.error("TTS Error", e);
       setIsPlaying(false);
    };
    utteranceRef.current = u;
    synth.speak(u);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (isPlaying) {
      if (synth.paused) {
         synth.resume();
      } else if (!synth.speaking) {
         playParagraph(activeParagraphIdx);
      }
    } else {
      synth.pause();
    }
  }, [isPlaying]);

  // TTS Timer
  useEffect(() => {
    if (ttsTimerMinutes > 0 && isPlaying) {
      const timer = setTimeout(() => {
         setIsPlaying(false);
         setTtsTimerMinutes(0);
      }, ttsTimerMinutes * 60 * 1000);
      return () => clearTimeout(timer);
    }
  }, [ttsTimerMinutes, isPlaying]);

  const toggleIsPlaying = () => {
     setIsPlaying(!isPlaying);
  };

  const increaseFontSize = () => setFontSize(prev => Math.min(prev + 2, 36));
  const decreaseFontSize = () => setFontSize(prev => Math.max(prev - 2, 12));

  return (
    <div className={`fixed inset-0 z-50 flex flex-col transition-colors duration-500 overflow-hidden ${bgColor}`}>
      
      {/* Dynamic Header */}
      <AnimatePresence>
        {isUIVisible && (
          <motion.header 
            initial={{ y: '-100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }}
            className={`absolute top-0 left-0 right-0 h-16 px-6 flex items-center justify-between z-10 bg-gradient-to-b from-black/5 to-transparent ${textColor}`}
          >
            <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-black/5 transition-colors"><ArrowLeft size={24} /></button>
            <span className="text-sm font-bold uppercase tracking-widest opacity-60 line-clamp-1 flex-1 text-center px-4">{book.format === 'TXT' || book.format === 'MD' ? book.title : '正在阅读'}</span>
            <div className="relative">
              <button 
                onClick={() => setShowActionMenu(!showActionMenu)} 
                className={`p-2 rounded-full transition-colors ${showActionMenu ? 'bg-primary/20 text-primary' : 'hover:bg-black/5'}`}
              >
                <MoreVertical size={24} />
              </button>
              
              <AnimatePresence>
                {showActionMenu && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[-1]"
                      onClick={() => setShowActionMenu(false)}
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute right-0 top-12 w-48 bg-surface shadow-premium border border-outline-variant/20 rounded-2xl overflow-hidden py-2 z-50"
                    >
                      <button 
                        onClick={() => { setShowActionMenu(false); alert('正在准备 TXT 文件并调用系统分享...'); }}
                        className="w-full px-4 py-3 text-left text-sm font-medium hover:bg-surface-variant/50 transition-colors flex items-center gap-3"
                      >
                        <FileText size={18} className="text-primary" /> 分享书籍 TXT
                      </button>
                      <button 
                        onClick={() => {
                          setShowActionMenu(false);
                          if (navigator.share) {
                            navigator.share({ title: '避风港书屋', text: `我正在使用避风港书屋，快来和我一起沉浸阅读吧！`, url: window.location.origin });
                          } else {
                            alert('分享链接已复制到剪贴板！');
                          }
                        }}
                        className="w-full px-4 py-3 text-left text-sm font-medium hover:bg-surface-variant/50 transition-colors flex items-center gap-3"
                      >
                        <Navigation size={18} className="text-primary" /> 分享软件
                      </button>
                      <button 
                        onClick={() => {
                          setShowActionMenu(false);
                          navigate('/library', { state: { bookId: book.id, filter: 'highlights' } });
                        }}
                        className="w-full px-4 py-3 text-left text-sm font-medium hover:bg-surface-variant/50 transition-colors flex items-center gap-3"
                      >
                        <Quote size={18} className="text-primary" /> 分享划线卡片
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Reading Core */}
      <main 
        ref={scrollContainerRef}
        className={`flex-1 hide-scrollbar w-full ${scrollMode === 'horizontal' ? 'overflow-x-hidden whitespace-nowrap pt-8 pb-8 px-6' : 'overflow-y-auto px-6 pt-16 pb-32 flex flex-col items-center'}`}
        onClick={handleArticleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {scrollMode === 'vertical' && (
           <div style={{ height: Math.min(pullDistance, 80), opacity: Math.min(pullDistance/80, 1) }} className="w-full flex items-center justify-center text-primary text-xs font-bold overflow-hidden transition-all duration-75">
              {pullDistance > 60 ? '释放添加书签' : '下拉添加书签...'}
           </div>
        )}
        <article 
          ref={articleRef} 
          className={`${scrollMode === 'vertical' ? 'w-full max-w-2xl flex flex-col gap-6' : ''} ${textColor} ${fontFamily}`} 
          style={{ 
            fontSize: `${fontSize}px`,
            columnWidth: scrollMode === 'horizontal' ? '100vw' : 'auto',
            columnGap: scrollMode === 'horizontal' ? '48px' : 'normal',
            height: scrollMode === 'horizontal' ? '100%' : 'auto',
          }}
        >
          {scrollMode === 'vertical' && (
            <header className="text-center mt-12 mb-4">
              <h1 className="text-2xl font-bold mb-4">{currentChapter?.title || book.title}</h1>
              <div className="h-px w-16 bg-primary/20 mx-auto" />
            </header>
          )}

          <div className="leading-relaxed text-justify space-y-6 opacity-90 whitespace-pre-wrap" style={{ lineHeight: lineHeight }}>
            {paragraphs.map((p, i) => {
              const isHighlighted = highlights.some(h => h.bookId === book.id && h.content === p && !h.isBookmark);
              const isCurrentlyPlaying = isPlaying && i === activeParagraphIdx && ttsState.bookId === book.id;
              return (
              <p 
                key={i} 
                className={`indent-[2em] ${isCurrentlyPlaying ? 'text-primary font-medium bg-primary/10 rounded px-1' : ''} ${(isPlaying || showPlayer) ? 'cursor-pointer hover:bg-primary/5 transition-colors rounded px-1' : ''} ${isHighlighted ? 'border-b-2 border-primary/40 pb-1' : ''}`}
                onClick={(e) => {
                  if (isPlaying || showPlayer) {
                    e.stopPropagation();
                    handleParagraphClick(i);
                  } else if (isHighlighted) {
                     const rect = e.currentTarget.getBoundingClientRect();
                     setRemoveHighlightCtx({ text: p, x: rect.left + rect.width / 2, y: Math.max(0, rect.top - 40) });
                     setHighlightCtx(null);
                     e.stopPropagation();
                  } else {
                    const selection = window.getSelection();
                    if (!selection || selection.toString().trim() === '') {
                      const range = document.createRange();
                      range.selectNodeContents(e.currentTarget);
                      selection?.removeAllRanges();
                      selection?.addRange(range);
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHighlightCtx({ text: p, x: rect.left + rect.width / 2, y: Math.max(0, rect.top - 40) });
                      setRemoveHighlightCtx(null);
                      e.stopPropagation();
                    }
                  }
                }}
              >
                {p}
              </p>
            )})}
          </div>
        </article>
        {scrollMode === 'vertical' && <div className="h-40 w-full flex-shrink-0" />}
      </main>

      {/* Highlight Tooltip */}
      <AnimatePresence>
        {highlightCtx && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{ position: 'fixed', top: highlightCtx.y - 60, left: Math.max(20, Math.min(window.innerWidth - 120, highlightCtx.x - 50)), zIndex: 100 }}
            className="bg-surface shadow-ambient border border-outline-variant/30 rounded-full px-4 py-2 flex items-center gap-3"
          >
            <button onMouseDown={(e) => { e.preventDefault(); handleSaveHighlight(); }} className="flex items-center gap-2 text-primary font-bold text-sm tracking-widest hover:text-primary/80 transition-colors">
              <Highlighter size={16} /> 划线
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {removeHighlightCtx && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            style={{ position: 'fixed', top: removeHighlightCtx.y - 60, left: Math.max(20, Math.min(window.innerWidth - 120, removeHighlightCtx.x - 50)), zIndex: 100 }}
            className="bg-surface shadow-ambient border border-outline-variant/30 rounded-full px-4 py-2 flex items-center gap-3"
          >
            <button onMouseDown={(e) => { e.preventDefault(); removeHighlightByContent(removeHighlightCtx.text, book.id); setRemoveHighlightCtx(null); }} className="flex items-center gap-2 text-error font-bold text-sm tracking-widest hover:text-error/80 transition-colors">
              <X size={16} /> 取消划线
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isUIVisible && (
          <>
            {/* Floating Audio Player (Mini) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-md">
              <div className="bg-surface/95 backdrop-blur-xl border border-primary/10 shadow-premium rounded-full p-2 flex items-center gap-4">
                <button onClick={toggleIsPlaying} className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all">
                  {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="ml-1" fill="currentColor" />}
                </button>
                <div className="flex-1 min-w-0" onClick={() => setShowPlayer(true)}>
                  <p className="text-xs font-bold text-primary truncate">当前朗读: 第 {currentChapterIndex + 1} 章节</p>
                  <p className="text-[10px] text-on-surface-variant truncate">{currentChapter?.title}</p>
                </div>
                <button onClick={() => setShowPlayer(true)} className="p-3 text-on-surface-variant hover:text-primary transition-colors">
                  <ListIcon size={18} />
                </button>
              </div>
            </motion.div>

            {/* Bottom Toolbox */}
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className={`absolute bottom-0 left-0 right-0 h-20 bg-surface/95 backdrop-blur border-t border-outline-variant/10 flex items-center justify-around px-6 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]`}>
              <button onClick={() => setShowChapters(true)} className="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary transition-colors">
                <ListIcon size={20} />
                <span className="text-[10px] uppercase font-bold">目录</span>
              </button>
              <button onClick={() => { setShowPlayer(true); if (!isPlaying) playParagraph(activeParagraphIdx); }} className="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary transition-colors">
                <Mic size={20} />
                <span className="text-[10px] uppercase font-bold">听书</span>
              </button>
              <button onClick={toggleBookmark} className={`flex flex-col items-center gap-1 transition-colors ${isBookmarked ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}>
                <Bookmark size={20} fill={isBookmarked ? 'currentColor' : 'none'} />
                <span className="text-[10px] uppercase font-bold">书签</span>
              </button>
              <button onClick={() => setShowSettings(true)} className="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary transition-colors">
                <SettingsIcon size={20} />
                <span className="text-[10px] uppercase font-bold">设置</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Fullscreen Player UI */}
      <AnimatePresence>
         {showPlayer && (
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-0 bg-surface z-[80] flex flex-col px-6 py-12">
               <div className="flex justify-between items-center mb-10 w-full max-w-lg mx-auto">
                 <button onClick={() => setShowPlayer(false)} className="p-2 rounded-full hover:bg-surface-variant text-on-surface relative"><ArrowLeft size={24} className="rotate-270" /></button>
                 <span className="font-bold tracking-widest text-sm text-on-surface">正在播放</span>
                 <button className="p-2 rounded-full hover:bg-surface-variant text-on-surface"><MoreVertical size={24} /></button>
               </div>
               
               <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg mx-auto pb-10">
                  <div className="w-[60vw] max-w-[280px] aspect-square bg-[#0b241c] rounded-2xl shadow-ambient mb-10 overflow-hidden flex items-center justify-center relative">
                     {book.coverUrl ? <img src={book.coverUrl} className="w-full h-full object-cover" /> : (
                        <div className={`absolute inset-6 border-2 border-primary-container bg-primary-container p-6 flex items-center justify-center`}>
                           <span className="text-white font-bold opacity-80 text-xl text-center leading-tight tracking-widest">{book.title}</span>
                        </div>
                     )}
                  </div>
                  
                  <h2 className="text-2xl font-bold text-on-surface text-center mb-3 line-clamp-2">{currentChapter?.title}</h2>
                  <p className="text-sm text-on-surface-variant mb-10 tracking-wider">《{book.title}》- {book.author}</p>
                  
                  {/* Draggable Progress Bar */}
                  <div className="w-full mb-10 group/slider">
                     <div 
                        ref={progressRef}
                        className="h-2 w-full bg-surface-variant rounded-full relative cursor-pointer mb-2 flex items-center"
                        onMouseDown={(e) => { setIsDraggingProgress(true); handleProgressInteraction(e); }}
                        onTouchStart={(e) => { setIsDraggingProgress(true); handleProgressInteraction(e); }}
                        onMouseMove={(e) => isDraggingProgress && handleProgressInteraction(e)}
                        onTouchMove={(e) => isDraggingProgress && handleProgressInteraction(e)}
                        onMouseUp={() => setIsDraggingProgress(false)}
                        onMouseLeave={() => setIsDraggingProgress(false)}
                        onTouchEnd={() => setIsDraggingProgress(false)}
                     >
                        <div 
                           className="h-full bg-primary rounded-full relative" 
                           style={{ width: `${(activeParagraphIdx / Math.max(1, paragraphs.length - 1)) * 100}%` }}
                        >
                           <div className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 bg-primary rounded-full shadow-lg translate-x-1/2 border-2 border-surface scale-0 group-hover/slider:scale-100 transition-transform" />
                        </div>
                     </div>
                     <div className="flex justify-between text-[10px] font-bold text-on-surface-variant">
                        <span>P.{activeParagraphIdx + 1}</span>
                        <span>共 {paragraphs.length} 段</span>
                     </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-6 mb-12">
                     <button onClick={() => { 
                          if (currentChapterIndex > 0) { setCurrentChapterIndex(currentChapterIndex - 1); setActiveParagraphIdx(0); if(isPlaying) setTimeout(() => playParagraph(0), 100); }
                     }} className="text-on-surface-variant hover:text-on-surface transition-colors" title="上一章">
                       <SkipBack size={24} />
                     </button>
                     <button onClick={() => { 
                          if (activeParagraphIdx > 0) { const newIdx = activeParagraphIdx - 1; setActiveParagraphIdx(newIdx); if(isPlaying) playParagraph(newIdx); }
                          else if (currentChapterIndex > 0) { setCurrentChapterIndex(currentChapterIndex - 1); setActiveParagraphIdx(0); if(isPlaying) setTimeout(() => playParagraph(0), 100); }
                     }} className="text-on-surface-variant hover:text-on-surface transition-colors" title="回退上一段">
                       <Rewind size={28} />
                     </button>
                     <button onClick={toggleIsPlaying} className="w-20 h-20 mx-2 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all">
                       {isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} className="ml-2" fill="currentColor" />}
                     </button>
                     <button onClick={() => {
                          if (activeParagraphIdx < paragraphs.length - 1) { const newIdx = activeParagraphIdx + 1; setActiveParagraphIdx(newIdx); if (isPlaying) playParagraph(newIdx); }
                          else if (currentChapterIndex < chaptersToUse.length - 1) { setCurrentChapterIndex(currentChapterIndex + 1); setActiveParagraphIdx(0); if(isPlaying) setTimeout(() => playParagraph(0), 100); }
                     }} className="text-on-surface-variant hover:text-on-surface transition-colors" title="快进下一段">
                       <FastForward size={28} />
                     </button>
                     <button onClick={() => {
                          if (currentChapterIndex < chaptersToUse.length - 1) { setCurrentChapterIndex(currentChapterIndex + 1); setActiveParagraphIdx(0); if(isPlaying) setTimeout(() => playParagraph(0), 100); }
                     }} className="text-on-surface-variant hover:text-on-surface transition-colors" title="下一章">
                       <SkipForward size={24} />
                     </button>
                  </div>
                  
                  {/* Voice Options / Timers */}
                  <div className="w-full bg-surface-variant/30 rounded-3xl p-6 border border-outline-variant/10">
                     <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2 text-on-surface font-bold text-sm">
                           <Volume2 size={16} className="text-primary"/> 音源与倍速
                        </div>
                        <div className="flex items-center gap-1 bg-surface rounded-full px-2 py-1 shadow-sm border border-outline-variant/20 text-xs">
                           {[0.75, 1, 1.25, 1.5, 2].map(speed => (
                              <button key={speed} onClick={() => { ttsRateRef.current = speed; setTtsRateState(speed); if(isPlaying) playParagraph(activeParagraphIdx); }} className={`px-2 py-0.5 rounded-full font-bold transition-colors ${ttsRateState === speed ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-on-surface'}`}>
                                 {speed}x
                              </button>
                           ))}
                        </div>
                     </div>
                     <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 mb-4">
                        {voices.map(v => (
                           <button 
                             key={v.name}
                             onClick={() => { setSelectedVoice(v.name); playParagraph(activeParagraphIdx); }} 
                             className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedVoice === v.name ? 'bg-primary text-white shadow-sm' : 'bg-surface border border-outline-variant/30 text-on-surface-variant'}`}
                           >
                              {v.name.split('-')[0].substring(0, 8)}
                           </button>
                        ))}
                        {voices.length === 0 && <span className="text-xs text-on-surface-variant">浏览器暂无可用中文音源</span>}
                     </div>
                     
                     <div className="flex justify-between items-center pt-2 border-t border-outline-variant/10">
                        <span className="flex items-center gap-2 text-xs font-bold text-on-surface-variant"><Clock size={16} /> 定时睡眠</span>
                        <div className="flex gap-2">
                           {[0, 15, 30].map(mins => (
                              <button 
                                key={mins} 
                                onClick={() => setTtsTimerMinutes(mins)}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${ttsTimerMinutes === mins ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-variant'}`}
                              >
                                {mins === 0 ? '关闭' : `${mins}分`}
                              </button>
                           ))}
                        </div>
                     </div>
                  </div>
                  <div className="mt-4 text-xs text-on-surface-variant flex items-center justify-center gap-1">
                     <MousePointerClick size={12} /> <span className="opacity-80">在正文点击任意段落可跳转朗读进度</span>
                  </div>
               </div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* Chapter Drawer */}
      <AnimatePresence>
        {showChapters && (
          <>
            <motion.div onClick={() => setShowChapters(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60]" />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed left-0 top-0 bottom-0 w-80 bg-surface shadow-2xl z-[70] p-8 flex flex-col">
              <h2 className="text-2xl font-bold text-primary mb-2">目录</h2>
              <p className="text-xs text-on-surface-variant mb-8 font-medium tracking-widest uppercase">{book.title}</p>
              
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 hide-scrollbar">
                {chaptersToUse.map((chap, idx) => {
                   const isPast = idx < currentChapterIndex;
                   const isCurrent = idx === currentChapterIndex;
                   return (
                   <button 
                    key={chap.id}
                    onClick={() => { setCurrentChapterIndex(idx); setActiveParagraphIdx(0); setShowChapters(false); scrollContainerRef.current?.scrollTo({ top: 0, left: 0 }); }}
                    className={`w-full text-left p-4 rounded-lg flex justify-between items-center transition-all ${isCurrent ? 'bg-primary/5 text-primary border-l-4 border-primary shadow-sm' : isPast ? 'text-on-surface-variant opacity-60 hover:opacity-80 hover:bg-surface-variant/30' : 'text-on-surface hover:bg-surface-variant/50'}`}
                  >
                    <div className="flex flex-col gap-1 w-[80%]">
                      <span className={`text-sm ${isCurrent ? 'font-bold' : isPast ? 'font-normal' : 'font-medium'} truncate`}>{chap.title}</span>
                      {isCurrent && (
                        <div className="flex flex-col gap-2 mt-2 w-full pr-4">
                          <div className="flex justify-between items-center w-full">
                            <span className="text-[10px] font-bold text-primary flex items-center gap-1"><BookOpen size={10} fill="currentColor"/> 正在阅读</span>
                            <span className="text-[10px] text-primary font-bold">{Math.round((activeParagraphIdx / Math.max(paragraphs.length || 1, 1)) * 100)}%</span>
                          </div>
                          <div className="w-full h-1 bg-primary/20 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(activeParagraphIdx / Math.max(paragraphs.length || 1, 1)) * 100}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] flex-shrink-0 ${isPast ? 'opacity-40' : 'opacity-50'}`}>{chap.page}</span>
                  </button>
                )})}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Settings Drawer */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div onClick={() => setShowSettings(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-[60]" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed bottom-0 left-0 right-0 bg-surface rounded-t-3xl shadow-2xl z-[70] px-8 pt-4 pb-12 max-h-[90vh] overflow-y-auto">
               <div className="w-12 h-1 bg-outline-variant/30 rounded-full mx-auto mb-6 flex-shrink-0" />
               <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-bold text-on-surface">阅读设置</h2>
                  <button onClick={() => setShowSettings(false)} className="p-2 text-on-surface-variant"><X size={20} /></button>
               </div>

               <div className="space-y-8">
                  <section>
                    <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">阅读模式</h3>
                    <div className="grid grid-cols-2 gap-4">
                       <button onClick={() => setScrollMode('vertical')} className={`py-4 flex flex-col items-center gap-2 rounded-xl border transition-all ${scrollMode === 'vertical' ? 'bg-primary/5 text-primary border-primary shadow-sm' : 'bg-surface-variant/30 border-transparent text-on-surface-variant'}`}>
                          <Navigation size={20} className="rotate-180" /> <span className="text-sm font-bold">上下滑动</span>
                       </button>
                       <button onClick={() => setScrollMode('horizontal')} className={`py-4 flex flex-col items-center gap-2 rounded-xl border transition-all ${scrollMode === 'horizontal' ? 'bg-primary/5 text-primary border-primary shadow-sm' : 'bg-surface-variant/30 border-transparent text-on-surface-variant'}`}>
                          <Navigation size={20} className="rotate-90" /> <span className="text-sm font-bold">左右翻页</span>
                       </button>
                    </div>
                    
                    <div className="mt-4 p-4 rounded-xl border border-outline-variant/20 flex items-center justify-between">
                       <div>
                          <p className="text-sm font-bold text-on-surface">自动滚动</p>
                          <p className="text-[10px] text-on-surface-variant mt-0.5">解放双手，沉浸阅读</p>
                       </div>
                       <button 
                         onClick={() => { setIsAutoScroll(!isAutoScroll); setScrollMode('vertical'); setShowSettings(false); }} 
                         className={`w-12 h-6 rounded-full relative transition-colors ${isAutoScroll ? 'bg-primary' : 'bg-surface-variant'}`}
                       >
                         <div className={`absolute top-1 bottom-1 w-4 rounded-full bg-white transition-all shadow-sm ${isAutoScroll ? 'left-7' : 'left-1'}`} />
                       </button>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">字体</h3>
                    <div className="grid grid-cols-3 gap-4">
                       <button onClick={() => setFontFamily('font-sans')} className={`py-3 rounded-xl border transition-all text-sm ${fontFamily === 'font-sans' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-surface-variant/30 border-transparent text-on-surface font-sans'}`}>思源黑体</button>
                       <button onClick={() => setFontFamily('font-serif')} className={`py-3 rounded-xl border transition-all text-sm ${fontFamily === 'font-serif' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-surface-variant/30 border-transparent text-on-surface font-serif'}`}>宋体</button>
                       <button onClick={() => setFontFamily('font-kai')} className={`py-3 rounded-xl border transition-all text-sm ${fontFamily === 'font-kai' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-surface-variant/30 border-transparent text-on-surface font-kai'}`}>楷体</button>
                    </div>
                  </section>

                  <section>
                    <div className="flex justify-between items-center mb-4">
                       <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">字号</h3>
                       <span className="text-xs font-bold text-primary">{fontSize}</span>
                    </div>
                    <div className="flex items-center gap-4">
                       <button onClick={decreaseFontSize} className="flex-shrink-0 w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-lg font-bold hover:bg-outline-variant transition-colors">A-</button>
                       <div className="h-1 flex-1 bg-surface-variant rounded-full relative">
                          <div className="absolute top-1/2 left-[50%] -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-lg border-2 border-surface" style={{ left: `${((fontSize - 12) / 24) * 100}%` }} />
                       </div>
                       <button onClick={increaseFontSize} className="flex-shrink-0 w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-lg font-bold hover:bg-outline-variant transition-colors">A+</button>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">行间距</h3>
                    <div className="grid grid-cols-4 gap-4">
                       {[1.4, 1.6, 1.8, 2.0].map(h => (
                         <button 
                           key={h}
                           onClick={() => setLineHeight(h)} 
                           className={`py-2 rounded-xl border transition-all text-sm font-bold ${lineHeight === h ? 'bg-primary text-white border-primary shadow-sm' : 'bg-surface-variant/30 border-transparent text-on-surface'}`}
                         >
                           {h}
                         </button>
                       ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">环境</h3>
                    <div className="grid grid-cols-3 gap-4">
                       <button onClick={() => setTheme('day')} className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${theme === 'day' ? 'bg-primary/5 border-primary text-primary shadow-sm' : 'bg-surface-variant/30 border-transparent text-outline'}`}>
                          <div className="w-6 h-6 rounded-full bg-white border border-outline-variant" />
                          <span className="text-xs font-bold">白天</span>
                       </button>
                       <button onClick={() => setTheme('eye')} className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${theme === 'eye' ? 'bg-primary/5 border-primary text-primary shadow-sm' : 'bg-surface-variant/30 border-transparent text-outline'}`}>
                          <div className="w-6 h-6 rounded-full bg-[#F8F5EE] border border-outline-variant" />
                          <span className="text-xs font-bold">护眼</span>
                       </button>
                       <button onClick={() => setTheme('night')} className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${theme === 'night' ? 'bg-primary/5 border-primary text-primary shadow-sm' : 'bg-surface-variant/30 border-transparent text-outline'}`}>
                          <div className="w-6 h-6 rounded-full bg-[#1B1C1C] border border-outline-variant" />
                          <span className="text-xs font-bold">夜间</span>
                       </button>
                    </div>
                  </section>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
