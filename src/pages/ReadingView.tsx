import {
  ArrowLeft,
  MoreVertical,
  Play,
  Pause,
  FastForward,
  Rewind,
  Settings as SettingsIcon,
  List as ListIcon,
  Bookmark,
  Mic,
  BookOpen,
  Highlighter,
  X,
  Clock,
  Navigation,
  MousePointerClick,
  Volume2,
  SkipBack,
  SkipForward,
  FileText,
  Quote,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { MOCK_CHAPTERS } from '../constants';

export function ReadingView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    books,
    addHighlight,
    removeHighlightByContent,
    highlights,
    theme,
    setTheme,
    ttsState,
    setTtsState,
    updateBook,
  } = useStore();

  const [isUIVisible, setIsUIVisible] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPlayer, setShowPlayer] = useState(location.state?.showPlayer || false);
  const [showActionMenu, setShowActionMenu] = useState(false);

  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [fontFamily, setFontFamily] = useState<'font-sans' | 'font-serif' | 'font-kai'>('font-sans');
  const [scrollMode, setScrollMode] = useState<'vertical' | 'horizontal'>('vertical');
  const [isAutoScroll, setIsAutoScroll] = useState(false);

  const [highlightCtx, setHighlightCtx] = useState<{ text: string; x: number; y: number } | null>(null);
  const [removeHighlightCtx, setRemoveHighlightCtx] = useState<{ text: string; x: number; y: number } | null>(null);

  const {
    isPlaying,
    activeParagraphIdx,
    currentChapterIndex,
    rate: ttsRateState,
    voice: selectedVoice,
  } = ttsState;

  const setIsPlaying = (playing: boolean) => setTtsState({ isPlaying: playing });
  const setActiveParagraphIdx = (idx: number) => setTtsState({ activeParagraphIdx: idx });
  const setCurrentChapterIndex = (idx: number) => setTtsState({ currentChapterIndex: idx });
  const setTtsRateState = (r: number) => setTtsState({ rate: r });
  const setSelectedVoice = (v: string) => setTtsState({ voice: v });

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [ttsTimerMinutes, setTtsTimerMinutes] = useState(0);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const ttsRateRef = useRef(ttsRateState);

  const articleRef = useRef<HTMLElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [pullDistance, setPullDistance] = useState(0);
  const touchStartYRef = useRef(0);
  const touchStartXRef = useRef(0);

  const progressRef = useRef<HTMLDivElement>(null);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);

  const [isMobileTtsMode, setIsMobileTtsMode] = useState(false);
  const mobileTtsToastCooldownRef = useRef(0);

  useEffect(() => {
    if (location.state?.showPlayer) {
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent || '';
    const mobileUA =
      /Android|iPhone|iPad|iPod|Mobile|HarmonyOS|MiuiBrowser|UCBrowser|HuaweiBrowser|MQQBrowser/i.test(ua);
    const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
    const touchPoints = navigator.maxTouchPoints > 0;

    setIsMobileTtsMode(mobileUA || (coarsePointer && touchPoints));
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const canUseDesktopTts = useMemo(() => {
    return !isMobileTtsMode && typeof window !== 'undefined' && 'speechSynthesis' in window;
  }, [isMobileTtsMode]);

  const showMobileTtsNotice = () => {
    const now = Date.now();
    if (now - mobileTtsToastCooldownRef.current < 1200) return;
    mobileTtsToastCooldownRef.current = now;
    alert('手机端听书功能正在完善中，当前请先在电脑端使用朗读功能。');
  };

  const handleOpenPlayer = () => {
    setShowPlayer(true);
    if (isMobileTtsMode) {
      showMobileTtsNotice();
    }
  };

  const handleProtectedTtsAction = (fn?: () => void) => {
    if (isMobileTtsMode) {
      showMobileTtsNotice();
      return;
    }
    fn?.();
  };

  const handleProgressInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (!progressRef.current || paragraphs.length === 0) return;

    const rect = progressRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newIdx = Math.floor(pos * Math.max(1, paragraphs.length - 1));

    setActiveParagraphIdx(newIdx);

    if (isPlaying && !isMobileTtsMode) {
      playParagraph(newIdx);
    }
  };

  const book = books.find((b) => b.id === id);

  useEffect(() => {
    if (book && book.chapters && book.chapters.length > 0) {
      const targetIndex = Math.floor((book.progress / 100) * book.chapters.length);
      const safeIndex = Math.max(0, Math.min(targetIndex, book.chapters.length - 1));
      if (safeIndex !== currentChapterIndex) {
        setCurrentChapterIndex(safeIndex);
      }
    }
  }, [book, currentChapterIndex, setCurrentChapterIndex]);

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
      totalProgress = currentChapterIndex * chapterWeight + (scrollPercent * chapterWeight) / 100;
    }

    const finalProgress = Math.min(100, Math.max(0, Math.round(totalProgress * 10) / 10));

    if (Math.abs(finalProgress - lastSavedProgress.current) > 0.5) {
      updateBook(book.id, { progress: finalProgress });
      lastSavedProgress.current = finalProgress;
    }
  };

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
      saveProgress();
    };
  }, [currentChapterIndex, scrollMode, book, updateBook]);

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
      <div className="fixed inset-0 z-50 flex min-h-screen flex-col items-center justify-center bg-surface text-on-surface-variant">
        <p className="mb-4">找不到该书籍，或书架为空。</p>
        <button onClick={() => navigate('/')} className="rounded-full bg-primary px-6 py-2 text-white">
          返回书架
        </button>
      </div>
    );
  }

  const chaptersToUse = (book.chapters && book.chapters.length > 0 ? book.chapters : MOCK_CHAPTERS).filter(
    (ch, idx, self) => {
      if (!ch?.content || ch.content.trim().length === 0) return false;
      const titleNorm = (ch.title || '').replace(/\s+/g, '');
      const firstIdx = self.findIndex((c) => (c.title || '').replace(/\s+/g, '') === titleNorm);

      if (firstIdx !== idx) {
        return ch.content.length > self[firstIdx].content.length;
      }
      return true;
    }
  );

  const safeChapterIndex =
    chaptersToUse.length > 0 ? Math.min(currentChapterIndex, Math.max(0, chaptersToUse.length - 1)) : 0;

  const currentChapter = chaptersToUse[safeChapterIndex] || chaptersToUse[0] || null;

  const contentStr =
    (typeof currentChapter?.content === 'string' && currentChapter.content) ||
    (typeof book.content === 'string' && book.content) ||
    '光线穿过那些高耸的穹顶，洒在地面的大理石上，形成一片片斑驳的亮影。\n在这个被称为“圣所”的地方，连呼吸似乎都变得轻盈。周围没有机器的轰鸣，没有人群的喧嚣，只有偶尔从远处传来的微风拂过石柱的低吟。';

  const paragraphs = contentStr
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean);

  useEffect(() => {
    if (!book) return;
    setTtsState({ paragraphs, bookId: book.id });
  }, [safeChapterIndex, book, paragraphs, setTtsState]);

  useEffect(() => {
    ttsRateRef.current = ttsRateState;
  }, [ttsRateState]);

  const bgColor =
    theme === 'day' ? 'bg-[#FCF9F8]' : theme === 'eye' ? 'bg-[#F8F5EE]' : 'bg-[#1B1C1C]';
  const textColor = theme === 'night' ? 'text-[#DCD9D9]' : 'text-[#2C2C2C]';

  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.toString().trim().length === 0) {
        setHighlightCtx(null);
        return;
      }

      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setHighlightCtx({
          text: selection.toString().trim(),
          x: rect.left + rect.width / 2,
          y: rect.top,
        });
      } catch {
        setHighlightCtx(null);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleSaveHighlight = () => {
    if (!highlightCtx) return;

    addHighlight({
      id: 'hl-' + Date.now(),
      bookId: book.id,
      bookTitle: book.title,
      content: highlightCtx.text,
      chapter: currentChapter?.title || book.title,
      date: new Date().toLocaleDateString('zh-CN'),
    });

    setHighlightCtx(null);
    window.getSelection()?.removeAllRanges();
    alert('已添加划线笔记！');
  };

  const currentBookmark =
    book &&
    highlights.find((h) => h.bookId === book.id && h.isBookmark && h.chapter === (currentChapter?.title || ''));
  const isBookmarked = !!currentBookmark;

  const toggleBookmark = () => {
    if (isBookmarked && currentBookmark) {
      removeHighlightByContent(currentBookmark.content, book.id);
      alert('已取消书签！');
    } else if (book) {
      addHighlight({
        id: 'bm-' + Date.now(),
        bookId: book.id,
        bookTitle: book.title,
        content: '网页进度书签',
        chapter: currentChapter?.title || book.title,
        date: new Date().toLocaleDateString('zh-CN'),
        isBookmark: true,
      });
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
      return;
    }

    if ((isPlaying || showPlayer) && (e.target as HTMLElement).tagName === 'P') {
      return;
    }

    setIsUIVisible(!isUIVisible);
  };

  const handleParagraphClick = (idx: number) => {
    if (isPlaying || showPlayer) {
      setActiveParagraphIdx(idx);
      handleProtectedTtsAction(() => playParagraph(idx));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSettings || showChapters || showPlayer) return;

      const scroller = scrollContainerRef.current;
      if (!scroller) return;

      const scrollAmt = scrollMode === 'horizontal' ? window.innerWidth : window.innerHeight * 0.8;

      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'AudioVolumeDown') {
        e.preventDefault();
        scroller.scrollBy({
          [scrollMode === 'horizontal' ? 'left' : 'top']: scrollAmt,
          behavior: 'smooth',
        });
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'AudioVolumeUp') {
        e.preventDefault();
        scroller.scrollBy({
          [scrollMode === 'horizontal' ? 'left' : 'top']: -scrollAmt,
          behavior: 'smooth',
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scrollMode, showSettings, showChapters, showPlayer]);

  useEffect(() => {
    if (isAutoScroll && !showPlayer && !isUIVisible && scrollMode === 'vertical') {
      const interval = setInterval(() => {
        scrollContainerRef.current?.scrollBy({ top: 1, behavior: 'auto' });
      }, 30);
      return () => clearInterval(interval);
    }
  }, [isAutoScroll, showPlayer, isUIVisible, scrollMode]);

  useEffect(() => {
    const synth = synthRef.current;
    if (!synth || !canUseDesktopTts) return;

    const loadVoices = () => {
      try {
        const v = synth.getVoices().filter((voice) => voice.lang.includes('zh'));
        setVoices(v);
        if (v.length > 0 && !selectedVoice) {
          setSelectedVoice(v[0].name);
        }
      } catch (e) {
        console.error('loadVoices error:', e);
      }
    };

    loadVoices();

    if ('onvoiceschanged' in synth) {
      synth.onvoiceschanged = loadVoices;
    }

    return () => {
      if ('onvoiceschanged' in synth) {
        synth.onvoiceschanged = null;
      }
    };
  }, [canUseDesktopTts, selectedVoice, setSelectedVoice]);

  const playParagraph = (idx: number) => {
    const synth = synthRef.current;
    if (!synth || !canUseDesktopTts) return;

    if (idx >= paragraphs.length) {
      setIsPlaying(false);
      return;
    }

    const text = paragraphs[idx];
    const u = new SpeechSynthesisUtterance(text);

    if (selectedVoice) {
      const voice = voices.find((v) => v.name === selectedVoice);
      if (voice) u.voice = voice;
    }

    u.rate = ttsRateRef.current;
    u.pitch = 1.0;

    u.onend = () => {
      const current = synthRef.current;
      if (!current || !canUseDesktopTts) return;

      if (ttsState.isPlaying) {
        setActiveParagraphIdx(idx + 1);
        playParagraph(idx + 1);
      }
    };

    u.onerror = (e) => {
      console.error('TTS Error', e);
      setIsPlaying(false);
    };

    utteranceRef.current = u;

    try {
      synth.cancel();
      synth.speak(u);
      setIsPlaying(true);
    } catch (e) {
      console.error('TTS start failed:', e);
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    const synth = synthRef.current;
    if (!synth || !canUseDesktopTts) return;

    try {
      if (isPlaying) {
        if (synth.paused) {
          synth.resume();
        } else if (!synth.speaking) {
          playParagraph(activeParagraphIdx);
        }
      } else {
        synth.pause();
      }
    } catch (e) {
      console.error('TTS play/pause error:', e);
      setIsPlaying(false);
    }
  }, [isPlaying, activeParagraphIdx, canUseDesktopTts]);

  useEffect(() => {
    if (ttsTimerMinutes > 0 && isPlaying) {
      const timer = setTimeout(() => {
        setIsPlaying(false);
        setTtsTimerMinutes(0);
      }, ttsTimerMinutes * 60 * 1000);
      return () => clearTimeout(timer);
    }
  }, [ttsTimerMinutes, isPlaying]);

  useEffect(() => {
    return () => {
      const synth = synthRef.current;
      if (!synth) return;
      try {
        synth.cancel();
      } catch { }
    };
  }, []);

  const toggleIsPlaying = () => {
    if (isMobileTtsMode) {
      showMobileTtsNotice();
      return;
    }
    setIsPlaying(!isPlaying);
  };

  const increaseFontSize = () => setFontSize((prev) => Math.min(prev + 2, 36));
  const decreaseFontSize = () => setFontSize((prev) => Math.max(prev - 2, 12));

  return (
    <div className={`fixed inset-0 z-50 flex flex-col overflow-hidden transition-colors duration-500 ${bgColor}`}>
      <AnimatePresence>
        {isUIVisible && (
          <motion.header
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            className={`absolute left-0 right-0 top-0 z-10 flex h-16 items-center justify-between bg-gradient-to-b from-black/5 to-transparent px-6 ${textColor}`}
          >
            <button onClick={() => navigate('/')} className="rounded-full p-2 transition-colors hover:bg-black/5">
              <ArrowLeft size={24} />
            </button>

            <span className="line-clamp-1 flex-1 px-4 text-center text-sm font-bold uppercase tracking-widest opacity-60">
              {book.format === 'TXT' || book.format === 'MD' ? book.title : '正在阅读'}
            </span>

            <div className="relative">
              <button
                onClick={() => setShowActionMenu(!showActionMenu)}
                className={`rounded-full p-2 transition-colors ${showActionMenu ? 'bg-primary/20 text-primary' : 'hover:bg-black/5'
                  }`}
              >
                <MoreVertical size={24} />
              </button>

              <AnimatePresence>
                {showActionMenu && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[-1]"
                      onClick={() => setShowActionMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute right-0 top-12 z-50 w-48 overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface py-2 shadow-premium"
                    >
                      <button
                        onClick={() => {
                          setShowActionMenu(false);
                          alert('正在准备 TXT 文件并调用系统分享...');
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-surface-variant/50"
                      >
                        <FileText size={18} className="text-primary" />
                        分享书籍 TXT
                      </button>

                      <button
                        onClick={() => {
                          setShowActionMenu(false);
                          if (navigator.share) {
                            navigator.share({
                              title: '避风港书屋',
                              text: '我正在使用避风港书屋，快来和我一起沉浸阅读吧！',
                              url: window.location.origin,
                            });
                          } else {
                            alert('分享链接已复制到剪贴板！');
                          }
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-surface-variant/50"
                      >
                        <Navigation size={18} className="text-primary" />
                        分享软件
                      </button>

                      <button
                        onClick={() => {
                          setShowActionMenu(false);
                          navigate('/library', { state: { bookId: book.id, filter: 'highlights' } });
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-surface-variant/50"
                      >
                        <Quote size={18} className="text-primary" />
                        分享划线卡片
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      <main
        ref={scrollContainerRef}
        className={`hide-scrollbar w-full flex-1 ${scrollMode === 'horizontal'
            ? 'overflow-x-hidden whitespace-nowrap px-6 pb-8 pt-8'
            : 'flex flex-col items-center overflow-y-auto px-6 pb-32 pt-16'
          }`}
        onClick={handleArticleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {scrollMode === 'vertical' && (
          <div
            style={{ height: Math.min(pullDistance, 80), opacity: Math.min(pullDistance / 80, 1) }}
            className="w-full overflow-hidden text-center text-xs font-bold text-primary transition-all duration-75"
          >
            {pullDistance > 60 ? '释放添加书签' : '下拉添加书签...'}
          </div>
        )}

        <article
          ref={articleRef}
          className={`${scrollMode === 'vertical' ? 'flex w-full max-w-2xl flex-col gap-6' : ''} ${textColor} ${fontFamily}`}
          style={{
            fontSize: `${fontSize}px`,
            columnWidth: scrollMode === 'horizontal' ? '100vw' : 'auto',
            columnGap: scrollMode === 'horizontal' ? '48px' : 'normal',
            height: scrollMode === 'horizontal' ? '100%' : 'auto',
          }}
        >
          {scrollMode === 'vertical' && (
            <header className="mb-4 mt-12 text-center">
              <h1 className="mb-4 text-2xl font-bold">{currentChapter?.title || book.title}</h1>
              <div className="mx-auto h-px w-16 bg-primary/20" />
            </header>
          )}

          <div
            className="space-y-6 whitespace-pre-wrap text-justify leading-relaxed opacity-90"
            style={{ lineHeight: lineHeight }}
          >
            {paragraphs.map((p, i) => {
              const isHighlighted = highlights.some((h) => h.bookId === book.id && h.content === p && !h.isBookmark);
              const isCurrentlyPlaying = isPlaying && i === activeParagraphIdx && ttsState.bookId === book.id;

              return (
                <p
                  key={i}
                  className={`indent-[2em] ${isCurrentlyPlaying ? 'rounded bg-primary/10 px-1 font-medium text-primary' : ''
                    } ${(isPlaying || showPlayer) ? 'cursor-pointer rounded px-1 transition-colors hover:bg-primary/5' : ''} ${isHighlighted ? 'border-b-2 border-primary/40 pb-1' : ''
                    }`}
                  onClick={(e) => {
                    if (isPlaying || showPlayer) {
                      e.stopPropagation();
                      handleParagraphClick(i);
                    } else if (isHighlighted) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setRemoveHighlightCtx({
                        text: p,
                        x: rect.left + rect.width / 2,
                        y: Math.max(0, rect.top - 40),
                      });
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
                        setHighlightCtx({
                          text: p,
                          x: rect.left + rect.width / 2,
                          y: Math.max(0, rect.top - 40),
                        });
                        setRemoveHighlightCtx(null);
                        e.stopPropagation();
                      }
                    }
                  }}
                >
                  {p}
                </p>
              );
            })}
          </div>
        </article>

        {scrollMode === 'vertical' && <div className="h-40 w-full flex-shrink-0" />}
      </main>

      <AnimatePresence>
        {highlightCtx && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: 'fixed',
              top: highlightCtx.y - 60,
              left: Math.max(20, Math.min(window.innerWidth - 120, highlightCtx.x - 50)),
              zIndex: 100,
            }}
            className="flex items-center gap-3 rounded-full border border-outline-variant/30 bg-surface px-4 py-2 shadow-ambient"
          >
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                handleSaveHighlight();
              }}
              className="flex items-center gap-2 text-sm font-bold tracking-widest text-primary transition-colors hover:text-primary/80"
            >
              <Highlighter size={16} />
              划线
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {removeHighlightCtx && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              position: 'fixed',
              top: removeHighlightCtx.y - 60,
              left: Math.max(20, Math.min(window.innerWidth - 120, removeHighlightCtx.x - 50)),
              zIndex: 100,
            }}
            className="flex items-center gap-3 rounded-full border border-outline-variant/30 bg-surface px-4 py-2 shadow-ambient"
          >
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                removeHighlightByContent(removeHighlightCtx.text, book.id);
                setRemoveHighlightCtx(null);
              }}
              className="flex items-center gap-2 text-sm font-bold tracking-widest text-error transition-colors hover:text-error/80"
            >
              <X size={16} />
              取消划线
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isUIVisible && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-24 left-1/2 z-40 w-[90%] max-w-md -translate-x-1/2"
            >
              <div className="flex items-center gap-4 rounded-full border border-primary/10 bg-surface/95 p-2 shadow-premium backdrop-blur-xl">
                <button
                  onClick={toggleIsPlaying}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all hover:scale-105 active:scale-95"
                >
                  {isPlaying ? (
                    <Pause size={20} fill="currentColor" />
                  ) : (
                    <Play size={20} className="ml-1" fill="currentColor" />
                  )}
                </button>

                <div className="min-w-0 flex-1" onClick={handleOpenPlayer}>
                  <p className="truncate text-xs font-bold text-primary">当前朗读: 第 {safeChapterIndex + 1} 章节</p>
                  <p className="truncate text-[10px] text-on-surface-variant">{currentChapter?.title}</p>
                </div>

                <button onClick={handleOpenPlayer} className="p-3 text-on-surface-variant transition-colors hover:text-primary">
                  <ListIcon size={18} />
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="absolute bottom-0 left-0 right-0 z-40 flex h-20 items-center justify-around border-t border-outline-variant/10 bg-surface/95 px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] backdrop-blur"
            >
              <button
                onClick={() => setShowChapters(true)}
                className="flex flex-col items-center gap-1 text-on-surface-variant transition-colors hover:text-primary"
              >
                <ListIcon size={20} />
                <span className="text-[10px] font-bold uppercase">目录</span>
              </button>

              <button
                onClick={handleOpenPlayer}
                className="flex flex-col items-center gap-1 text-on-surface-variant transition-colors hover:text-primary"
              >
                <Mic size={20} />
                <span className="text-[10px] font-bold uppercase">听书</span>
              </button>

              <button
                onClick={toggleBookmark}
                className={`flex flex-col items-center gap-1 transition-colors ${isBookmarked ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
                  }`}
              >
                <Bookmark size={20} fill={isBookmarked ? 'currentColor' : 'none'} />
                <span className="text-[10px] font-bold uppercase">书签</span>
              </button>

              <button
                onClick={() => setShowSettings(true)}
                className="flex flex-col items-center gap-1 text-on-surface-variant transition-colors hover:text-primary"
              >
                <SettingsIcon size={20} />
                <span className="text-[10px] font-bold uppercase">设置</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPlayer && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[80] flex flex-col bg-surface px-6 py-12"
          >
            <div className="mx-auto mb-10 flex w-full max-w-lg items-center justify-between">
              <button onClick={() => setShowPlayer(false)} className="relative rounded-full p-2 text-on-surface transition-colors hover:bg-surface-variant">
                <ArrowLeft size={24} className="rotate-270" />
              </button>

              <span className="text-sm font-bold tracking-widest text-on-surface">正在播放</span>

              <button className="rounded-full p-2 text-on-surface transition-colors hover:bg-surface-variant">
                <MoreVertical size={24} />
              </button>
            </div>

            <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center pb-10">
              <div className="relative mb-10 flex aspect-square w-[60vw] max-w-[280px] items-center justify-center overflow-hidden rounded-2xl bg-[#0b241c] shadow-ambient">
                {book.coverUrl ? (
                  <img src={book.coverUrl} className="h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-6 flex items-center justify-center border-2 border-primary-container bg-primary-container p-6">
                    <span className="text-center text-xl font-bold leading-tight tracking-widest text-white opacity-80">
                      {book.title}
                    </span>
                  </div>
                )}
              </div>

              <h2 className="mb-3 line-clamp-2 text-center text-2xl font-bold text-on-surface">
                {currentChapter?.title}
              </h2>
              <p className="mb-4 text-sm tracking-wider text-on-surface-variant">
                《{book.title}》- {book.author}
              </p>

              {isMobileTtsMode && (
                <div className="mb-6 w-full rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-primary">
                  手机端听书功能正在完善中，当前可继续正常阅读；朗读功能请先在电脑端使用。
                </div>
              )}

              <div className="group/slider mb-10 w-full">
                <div
                  ref={progressRef}
                  className="relative mb-2 flex h-2 w-full cursor-pointer items-center rounded-full bg-surface-variant"
                  onMouseDown={(e) => {
                    setIsDraggingProgress(true);
                    handleProgressInteraction(e);
                  }}
                  onTouchStart={(e) => {
                    setIsDraggingProgress(true);
                    handleProgressInteraction(e);
                  }}
                  onMouseMove={(e) => isDraggingProgress && handleProgressInteraction(e)}
                  onTouchMove={(e) => isDraggingProgress && handleProgressInteraction(e)}
                  onMouseUp={() => setIsDraggingProgress(false)}
                  onMouseLeave={() => setIsDraggingProgress(false)}
                  onTouchEnd={() => setIsDraggingProgress(false)}
                >
                  <div
                    className="relative h-full rounded-full bg-primary"
                    style={{ width: `${(activeParagraphIdx / Math.max(1, paragraphs.length - 1)) * 100}%` }}
                  >
                    <div className="absolute right-0 top-1/2 h-5 w-5 translate-x-1/2 -translate-y-1/2 scale-0 rounded-full border-2 border-surface bg-primary shadow-lg transition-transform group-hover/slider:scale-100" />
                  </div>
                </div>

                <div className="flex justify-between text-[10px] font-bold text-on-surface-variant">
                  <span>P.{activeParagraphIdx + 1}</span>
                  <span>共 {paragraphs.length} 段</span>
                </div>
              </div>

              <div className="mb-12 flex items-center gap-6">
                <button
                  onClick={() =>
                    handleProtectedTtsAction(() => {
                      if (safeChapterIndex > 0) {
                        setCurrentChapterIndex(safeChapterIndex - 1);
                        setActiveParagraphIdx(0);
                        if (isPlaying) setTimeout(() => playParagraph(0), 100);
                      }
                    })
                  }
                  className="text-on-surface-variant transition-colors hover:text-on-surface"
                  title="上一章"
                >
                  <SkipBack size={24} />
                </button>

                <button
                  onClick={() =>
                    handleProtectedTtsAction(() => {
                      if (activeParagraphIdx > 0) {
                        const newIdx = activeParagraphIdx - 1;
                        setActiveParagraphIdx(newIdx);
                        if (isPlaying) playParagraph(newIdx);
                      } else if (safeChapterIndex > 0) {
                        setCurrentChapterIndex(safeChapterIndex - 1);
                        setActiveParagraphIdx(0);
                        if (isPlaying) setTimeout(() => playParagraph(0), 100);
                      }
                    })
                  }
                  className="text-on-surface-variant transition-colors hover:text-on-surface"
                  title="回退上一段"
                >
                  <Rewind size={28} />
                </button>

                <button
                  onClick={toggleIsPlaying}
                  className="mx-2 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all hover:scale-105 active:scale-95"
                >
                  {isPlaying ? (
                    <Pause size={36} fill="currentColor" />
                  ) : (
                    <Play size={36} className="ml-2" fill="currentColor" />
                  )}
                </button>

                <button
                  onClick={() =>
                    handleProtectedTtsAction(() => {
                      if (activeParagraphIdx < paragraphs.length - 1) {
                        const newIdx = activeParagraphIdx + 1;
                        setActiveParagraphIdx(newIdx);
                        if (isPlaying) playParagraph(newIdx);
                      } else if (safeChapterIndex < chaptersToUse.length - 1) {
                        setCurrentChapterIndex(safeChapterIndex + 1);
                        setActiveParagraphIdx(0);
                        if (isPlaying) setTimeout(() => playParagraph(0), 100);
                      }
                    })
                  }
                  className="text-on-surface-variant transition-colors hover:text-on-surface"
                  title="快进下一段"
                >
                  <FastForward size={28} />
                </button>

                <button
                  onClick={() =>
                    handleProtectedTtsAction(() => {
                      if (safeChapterIndex < chaptersToUse.length - 1) {
                        setCurrentChapterIndex(safeChapterIndex + 1);
                        setActiveParagraphIdx(0);
                        if (isPlaying) setTimeout(() => playParagraph(0), 100);
                      }
                    })
                  }
                  className="text-on-surface-variant transition-colors hover:text-on-surface"
                  title="下一章"
                >
                  <SkipForward size={24} />
                </button>
              </div>

              <div className="w-full rounded-3xl border border-outline-variant/10 bg-surface-variant/30 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-on-surface">
                    <Volume2 size={16} className="text-primary" />
                    音源与倍速
                  </div>

                  <div className="flex items-center gap-1 rounded-full border border-outline-variant/20 bg-surface px-2 py-1 text-xs shadow-sm">
                    {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
                      <button
                        key={speed}
                        onClick={() =>
                          handleProtectedTtsAction(() => {
                            ttsRateRef.current = speed;
                            setTtsRateState(speed);
                            if (isPlaying) playParagraph(activeParagraphIdx);
                          })
                        }
                        className={`rounded-full px-2 py-0.5 font-bold transition-colors ${ttsRateState === speed
                            ? 'bg-primary text-white'
                            : 'text-on-surface-variant hover:text-on-surface'
                          }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="hide-scrollbar mb-4 flex gap-2 overflow-x-auto pb-2">
                  {voices.map((v) => (
                    <button
                      key={v.name}
                      onClick={() =>
                        handleProtectedTtsAction(() => {
                          setSelectedVoice(v.name);
                          playParagraph(activeParagraphIdx);
                        })
                      }
                      className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-all ${selectedVoice === v.name
                          ? 'bg-primary text-white shadow-sm'
                          : 'border border-outline-variant/30 bg-surface text-on-surface-variant'
                        }`}
                    >
                      {v.name.split('-')[0].substring(0, 8)}
                    </button>
                  ))}

                  {voices.length === 0 && (
                    <span className="text-xs text-on-surface-variant">
                      {isMobileTtsMode ? '手机端暂不启用朗读音源' : '浏览器暂无可用中文音源'}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-outline-variant/10 pt-2">
                  <span className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
                    <Clock size={16} />
                    定时睡眠
                  </span>

                  <div className="flex gap-2">
                    {[0, 15, 30].map((mins) => (
                      <button
                        key={mins}
                        onClick={() =>
                          handleProtectedTtsAction(() => {
                            setTtsTimerMinutes(mins);
                          })
                        }
                        className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${ttsTimerMinutes === mins
                            ? 'bg-secondary-container text-on-secondary-container'
                            : 'text-on-surface-variant hover:bg-surface-variant'
                          }`}
                      >
                        {mins === 0 ? '关闭' : `${mins}分`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-1 text-xs text-on-surface-variant">
                <MousePointerClick size={12} />
                <span className="opacity-80">在正文点击任意段落可跳转朗读进度</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showChapters && (
          <>
            <motion.div
              onClick={() => setShowChapters(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 top-0 z-[70] flex w-80 flex-col bg-surface p-8 shadow-2xl"
            >
              <h2 className="mb-2 text-2xl font-bold text-primary">目录</h2>
              <p className="mb-8 text-xs font-medium uppercase tracking-widest text-on-surface-variant">
                {book.title}
              </p>

              <div className="hide-scrollbar flex-1 space-y-2 overflow-y-auto pr-2">
                {chaptersToUse.map((chap, idx) => {
                  const isPast = idx < safeChapterIndex;
                  const isCurrent = idx === safeChapterIndex;

                  return (
                    <button
                      key={chap.id}
                      onClick={() => {
                        setCurrentChapterIndex(idx);
                        setActiveParagraphIdx(0);
                        setShowChapters(false);
                        scrollContainerRef.current?.scrollTo({ top: 0, left: 0 });
                      }}
                      className={`flex w-full items-center justify-between rounded-lg p-4 text-left transition-all ${isCurrent
                          ? 'border-l-4 border-primary bg-primary/5 text-primary shadow-sm'
                          : isPast
                            ? 'text-on-surface-variant opacity-60 hover:bg-surface-variant/30 hover:opacity-80'
                            : 'text-on-surface hover:bg-surface-variant/50'
                        }`}
                    >
                      <div className="flex w-[80%] flex-col gap-1">
                        <span
                          className={`truncate text-sm ${isCurrent ? 'font-bold' : isPast ? 'font-normal' : 'font-medium'
                            }`}
                        >
                          {chap.title}
                        </span>

                        {isCurrent && (
                          <div className="mt-2 flex w-full flex-col gap-2 pr-4">
                            <div className="flex w-full items-center justify-between">
                              <span className="flex items-center gap-1 text-[10px] font-bold text-primary">
                                <BookOpen size={10} fill="currentColor" />
                                正在阅读
                              </span>
                              <span className="text-[10px] font-bold text-primary">
                                {Math.round((activeParagraphIdx / Math.max(paragraphs.length || 1, 1)) * 100)}%
                              </span>
                            </div>

                            <div className="h-1 w-full overflow-hidden rounded-full bg-primary/20">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${(activeParagraphIdx / Math.max(paragraphs.length || 1, 1)) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <span className={`flex-shrink-0 text-[10px] ${isPast ? 'opacity-40' : 'opacity-50'}`}>
                        {chap.page}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              onClick={() => setShowSettings(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[1px]"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 z-[70] max-h-[90vh] overflow-y-auto rounded-t-3xl bg-surface px-8 pb-12 pt-4 shadow-2xl"
            >
              <div className="mx-auto mb-6 h-1 w-12 flex-shrink-0 rounded-full bg-outline-variant/30" />

              <div className="mb-8 flex items-center justify-between">
                <h2 className="text-xl font-bold text-on-surface">阅读设置</h2>
                <button onClick={() => setShowSettings(false)} className="p-2 text-on-surface-variant">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-8">
                <section>
                  <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    阅读模式
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setScrollMode('vertical')}
                      className={`flex flex-col items-center gap-2 rounded-xl border py-4 transition-all ${scrollMode === 'vertical'
                          ? 'border-primary bg-primary/5 text-primary shadow-sm'
                          : 'border-transparent bg-surface-variant/30 text-on-surface-variant'
                        }`}
                    >
                      <Navigation size={20} className="rotate-180" />
                      <span className="text-sm font-bold">上下滑动</span>
                    </button>

                    <button
                      onClick={() => setScrollMode('horizontal')}
                      className={`flex flex-col items-center gap-2 rounded-xl border py-4 transition-all ${scrollMode === 'horizontal'
                          ? 'border-primary bg-primary/5 text-primary shadow-sm'
                          : 'border-transparent bg-surface-variant/30 text-on-surface-variant'
                        }`}
                    >
                      <Navigation size={20} className="rotate-90" />
                      <span className="text-sm font-bold">左右翻页</span>
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-xl border border-outline-variant/20 p-4">
                    <div>
                      <p className="text-sm font-bold text-on-surface">自动滚动</p>
                      <p className="mt-0.5 text-[10px] text-on-surface-variant">解放双手，沉浸阅读</p>
                    </div>

                    <button
                      onClick={() => {
                        setIsAutoScroll(!isAutoScroll);
                        setScrollMode('vertical');
                        setShowSettings(false);
                      }}
                      className={`relative h-6 w-12 rounded-full transition-colors ${isAutoScroll ? 'bg-primary' : 'bg-surface-variant'
                        }`}
                    >
                      <div
                        className={`absolute bottom-1 top-1 w-4 rounded-full bg-white shadow-sm transition-all ${isAutoScroll ? 'left-7' : 'left-1'
                          }`}
                      />
                    </button>
                  </div>
                </section>

                <section>
                  <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    字体
                  </h3>

                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => setFontFamily('font-sans')}
                      className={`rounded-xl border py-3 text-sm transition-all ${fontFamily === 'font-sans'
                          ? 'border-primary bg-primary text-white shadow-sm'
                          : 'border-transparent bg-surface-variant/30 font-sans text-on-surface'
                        }`}
                    >
                      思源黑体
                    </button>

                    <button
                      onClick={() => setFontFamily('font-serif')}
                      className={`rounded-xl border py-3 text-sm transition-all ${fontFamily === 'font-serif'
                          ? 'border-primary bg-primary text-white shadow-sm'
                          : 'border-transparent bg-surface-variant/30 font-serif text-on-surface'
                        }`}
                    >
                      宋体
                    </button>

                    <button
                      onClick={() => setFontFamily('font-kai')}
                      className={`rounded-xl border py-3 text-sm transition-all ${fontFamily === 'font-kai'
                          ? 'border-primary bg-primary text-white shadow-sm'
                          : 'border-transparent bg-surface-variant/30 font-kai text-on-surface'
                        }`}
                    >
                      楷体
                    </button>
                  </div>
                </section>

                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">字号</h3>
                    <span className="text-xs font-bold text-primary">{fontSize}</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={decreaseFontSize}
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface-variant text-lg font-bold transition-colors hover:bg-outline-variant"
                    >
                      A-
                    </button>

                    <div className="relative h-1 flex-1 rounded-full bg-surface-variant">
                      <div
                        className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-surface bg-primary shadow-lg"
                        style={{ left: `${((fontSize - 12) / 24) * 100}%` }}
                      />
                    </div>

                    <button
                      onClick={increaseFontSize}
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface-variant text-lg font-bold transition-colors hover:bg-outline-variant"
                    >
                      A+
                    </button>
                  </div>
                </section>

                <section>
                  <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    行间距
                  </h3>

                  <div className="grid grid-cols-4 gap-4">
                    {[1.4, 1.6, 1.8, 2.0].map((h) => (
                      <button
                        key={h}
                        onClick={() => setLineHeight(h)}
                        className={`rounded-xl border py-2 text-sm font-bold transition-all ${lineHeight === h
                            ? 'border-primary bg-primary text-white shadow-sm'
                            : 'border-transparent bg-surface-variant/30 text-on-surface'
                          }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    环境
                  </h3>

                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => setTheme('day')}
                      className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${theme === 'day'
                          ? 'border-primary bg-primary/5 text-primary shadow-sm'
                          : 'border-transparent bg-surface-variant/30 text-outline'
                        }`}
                    >
                      <div className="h-6 w-6 rounded-full border border-outline-variant bg-white" />
                      <span className="text-xs font-bold">白天</span>
                    </button>

                    <button
                      onClick={() => setTheme('eye')}
                      className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${theme === 'eye'
                          ? 'border-primary bg-primary/5 text-primary shadow-sm'
                          : 'border-transparent bg-surface-variant/30 text-outline'
                        }`}
                    >
                      <div className="h-6 w-6 rounded-full border border-outline-variant bg-[#F8F5EE]" />
                      <span className="text-xs font-bold">护眼</span>
                    </button>

                    <button
                      onClick={() => setTheme('night')}
                      className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${theme === 'night'
                          ? 'border-primary bg-primary/5 text-primary shadow-sm'
                          : 'border-transparent bg-surface-variant/30 text-outline'
                        }`}
                    >
                      <div className="h-6 w-6 rounded-full border border-outline-variant bg-[#1B1C1C]" />
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
