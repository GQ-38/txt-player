import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, CheckCircle2, ChevronLeft, Sparkles, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';

const ENCOURAGING_WORDS = [
  "坚持就是胜利，你是最棒的读者！",
  "每一份努力都会在书页间开花。",
  "阅读是通往智慧最近的路，你已经在路上了。",
  "今日打卡完成，奖励自己一段静谧的阅读时光吧。",
  "连续打卡让你的精神世界更加丰盈。",
  "书山有路勤为径，你的每一步都算数。"
];

export function CheckIn() {
  const navigate = useNavigate();
  const { user, performCheckIn } = useStore();
  const [showAnimation, setShowAnimation] = useState(false);
  const [message, setMessage] = useState('');
  const [word, setWord] = useState('');

  const handleCheckIn = () => {
    const result = performCheckIn();
    setMessage(result.message);
    setWord(ENCOURAGING_WORDS[Math.floor(Math.random() * ENCOURAGING_WORDS.length)]);
    if (result.success) {
      setShowAnimation(true);
      setTimeout(() => setShowAnimation(false), 5000);
    } else {
      // Still show the UI but maybe a different animation if needed
    }
  };

  const isAlreadyCheckedIn = user?.stats.lastCheckInDate === new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="p-4 flex items-center border-b border-outline-variant/10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-on-surface-variant hover:bg-surface-variant rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="ml-2 font-bold text-lg">打卡中心</h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <AnimatePresence>
          {showAnimation && (
            <>
              {/* Particles/Confetti simulation with motion */}
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    opacity: 1, 
                    x: 0, 
                    y: 0,
                    scale: 0 
                  }}
                  animate={{ 
                    opacity: 0, 
                    x: (Math.random() - 0.5) * 400, 
                    y: (Math.random() - 0.5) * 400 - 100,
                    scale: Math.random() * 2,
                    rotate: Math.random() * 360
                  }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  className="absolute pointer-events-none"
                  style={{
                    backgroundColor: ['#1A5D1A', '#F1C93B', '#D21312', '#088395'][Math.floor(Math.random() * 4)],
                    width: '8px',
                    height: '8px',
                    borderRadius: Math.random() > 0.5 ? '50%' : '0'
                  }}
                />
              ))}
              
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
              >
                <div className="bg-primary/90 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3">
                  <Sparkles size={24} />
                  <span className="font-bold text-lg">打卡成功！</span>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <section className="bg-white rounded-3xl p-8 shadow-premium border border-primary/5 w-full max-w-sm flex flex-col items-center text-center relative z-0">
          <div className={`w-24 h-24 rounded-full mb-6 flex items-center justify-center transition-all duration-500 ${isAlreadyCheckedIn ? 'bg-primary/10 text-primary' : 'bg-surface-variant text-on-surface-variant'}`}>
             {isAlreadyCheckedIn ? <CheckCircle2 size={48} strokeWidth={2.5} /> : <Calendar size={48} strokeWidth={1.5} />}
          </div>

          <h2 className="text-2xl font-bold text-on-surface mb-2">
            {isAlreadyCheckedIn ? '今日已圆满' : '新的开始'}
          </h2>
          <p className="text-on-surface-variant text-sm mb-8 leading-relaxed">
            {isAlreadyCheckedIn 
              ? '你已经完成了今日份的打卡，保持这份热爱，继续在书海航行吧。' 
              : '点滴积累，汇聚成海。点击下方按钮开始你今日的阅读旅程。'}
          </p>

          <div className="w-full space-y-4">
            <div className="flex justify-between items-center p-4 bg-surface-container rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
                  <Trophy size={20} />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-outline uppercase tracking-wider">连续打卡</p>
                  <p className="font-bold text-on-surface">{user?.stats.consecutiveDays || 0} 天</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleCheckIn}
              disabled={isAlreadyCheckedIn}
              className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${isAlreadyCheckedIn ? 'bg-outline text-white opacity-60 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary/90'}`}
            >
              {isAlreadyCheckedIn ? '已完成打卡' : '确 认 打 卡'}
            </button>
          </div>
        </section>

        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12 text-center max-w-xs"
            >
              <h3 className="font-bold text-primary mb-2 flex items-center justify-center gap-2">
                <Sparkles size={16} /> 提示
              </h3>
              <p className="text-on-surface-variant text-sm font-medium mb-4">{message}</p>
              {word && (
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 italic text-on-surface-variant text-xs leading-loose">
                  “ {word} ”
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
