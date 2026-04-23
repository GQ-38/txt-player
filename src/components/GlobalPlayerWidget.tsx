import { Play, Pause, Headphones } from 'lucide-react';
import { motion, useAnimation, useMotionValue, animate } from 'motion/react';
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store';

export function GlobalPlayerWidget() {
  const { ttsState, setTtsState, books } = useStore();
  const location = useLocation();
  const navigate = useNavigate();

  const isReadingCurrentBook = location.pathname.startsWith('/reading/') && location.pathname.includes(ttsState.bookId || '');
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInactive, setIsInactive] = useState(false);
  const [edge, setEdge] = useState<'left' | 'right'>('left');
  
  const containerRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(window.innerHeight * 0.7);

  // Resize handler to keep it in bounds
  useEffect(() => {
    const handleResize = () => {
      // Re-evaluate x position
      if (edge === 'right') {
        x.set(window.innerWidth - 48);
      }
      // Ensure y is not out of bounds
      if (y.get() > window.innerHeight - 100) {
         y.set(window.innerHeight - 100);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [edge, x, y]);

  // Inactivity timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!isExpanded) {
      timer = setTimeout(() => {
        setIsInactive(true);
      }, 3000);
    } else {
      setIsInactive(false);
    }
    return () => clearTimeout(timer);
  }, [isExpanded, ttsState.isPlaying]);

  // Click outside to collapse
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isExpanded && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isExpanded]);

  if (!ttsState.bookId || (!ttsState.isPlaying && !isReadingCurrentBook && ttsState.activeParagraphIdx === 0)) {
    return null;
  }

  if (isReadingCurrentBook) return null;

  const book = books.find(b => b.id === ttsState.bookId);

  const handleDragEnd = (e: any, info: any) => {
    // If we just clicked, don't snap/drag
    if (Math.abs(info.offset.x) < 5 && Math.abs(info.offset.y) < 5) return;

    const currentX = x.get();
    const currentY = y.get();

    const newEdge = currentX > window.innerWidth / 2 ? 'right' : 'left';
    setEdge(newEdge);
    setIsInactive(false);

    // Keep Y in bounds
    let finalY = currentY;
    if (finalY < 60) finalY = 60; // Top padding
    if (finalY > window.innerHeight - 100) finalY = window.innerHeight - 100; // Bottom padding

    animate(x, newEdge === 'left' ? 0 : window.innerWidth - 48, { type: 'spring', damping: 25, stiffness: 200 });
    animate(y, finalY, { type: 'spring', damping: 25, stiffness: 200 });
  };

  const shiftX = isInactive ? (edge === 'left' ? -24 : 24) : 0;
  
  // Calculate width based on state
  const playerWidth = isExpanded ? Math.min(window.innerWidth - 32, 320) : 48;
  
  // To avoid x conflicts between drag, animate, and layout, we will drive x purely via animate if we need to
  // but framer motion handles drag on x well if we bind x to style.
  // Instead of shifting `x` in `animate`, we will wrap the inner contents to handle the visual shift for 'inactive', 
  // or use `translateX` explicitly for the inactive shift to not fight with `x`.

  return (
    <motion.div 
       ref={containerRef}
       layout
       style={{ x, y, width: playerWidth }}
       drag={!isExpanded}
       dragMomentum={false}
       onDragEnd={handleDragEnd}
       onDragStart={() => setIsInactive(false)}
       animate={{ 
          // When expanding on the right edge, we shift left.
          x: isExpanded && edge === 'right' ? window.innerWidth - playerWidth - 16 : edge === 'right' ? window.innerWidth - 48 : edge === 'left' && isExpanded ? 16 : 0,
          translateX: isInactive ? (edge === 'left' ? '-50%' : '50%') : '0%',
          opacity: isInactive ? 0.4 : 1 
       }}
       transition={{ type: 'spring', damping: 25, stiffness: 200 }}
       className={`fixed top-0 left-0 z-50 bg-black/80 backdrop-blur-md border border-white/10 shadow-premium flex items-center overflow-hidden touch-none
         ${isExpanded ? 'h-16 rounded-2xl flex-row px-3 gap-3 cursor-default' : 'h-12 rounded-full justify-center cursor-move'}
       `}
       onClick={() => {
         if (!isExpanded) {
           setIsExpanded(true);
           setIsInactive(false);
         }
       }}
    >
      {/* Ball View (Collapsed) */}
      {!isExpanded && (
        <div className="w-full h-full flex items-center justify-center text-white relative">
          <Headphones size={20} />
          {ttsState.isPlaying && (
            <motion.div 
               animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} 
               transition={{ repeat: Infinity, duration: 2 }}
               className="absolute inset-0 border-2 border-white/50 rounded-full"
            />
          )}
        </div>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <>
          <div 
             className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0 cursor-pointer"
             onClick={() => navigate(`/reading/${ttsState.bookId}`, { state: { showPlayer: true } })}
          >
            <Headphones size={18} />
          </div>
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/reading/${ttsState.bookId}`, { state: { showPlayer: true } })}>
            <p className="text-white text-sm font-bold truncate">{book?.title || '未知书籍'}</p>
            <p className="text-white/60 text-[10px] truncate">第 {ttsState.currentChapterIndex + 1} 章 · 后台播放中</p>
          </div>
          <button 
            onClick={(e) => { 
               e.stopPropagation(); 
               setTtsState(prev => ({ ...prev, isPlaying: !prev.isPlaying })); 
               if (ttsState.isPlaying) window.speechSynthesis.pause(); 
               else window.speechSynthesis.resume(); 
            }} 
            className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform shrink-0"
          >
            {ttsState.isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
          </button>
        </>
      )}
    </motion.div>
  );
}
