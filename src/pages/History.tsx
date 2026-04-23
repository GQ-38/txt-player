import { motion } from 'motion/react';
import { ArrowLeft, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';

export function History() {
  const navigate = useNavigate();
  const { books } = useStore();
  const historyBooks = [...books].sort((a,b) => b.progress - a.progress); // Mock sort by read progress

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
            <Clock className="text-primary" size={24} />
            阅读历史
         </h2>
      </div>

      <div className="space-y-4">
         {historyBooks.map((book) => (
            <div key={book.id} onClick={() => navigate(`/reading/${book.id}`)} className="flex items-center gap-4 p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm cursor-pointer hover:shadow-premium transition-all">
               <div className="w-12 h-16 bg-surface-variant rounded shadow-sm overflow-hidden flex-shrink-0">
                  {book.coverUrl ? <img src={book.coverUrl} className="w-full h-full object-cover" /> : <div className={`w-full h-full bg-gradient-to-br ${book.accentColor || 'from-surface-variant to-outline-variant'}`} />}
               </div>
               <div className="flex-grow">
                  <h3 className="text-base font-bold text-on-surface">{book.title}</h3>
                  <p className="text-xs text-on-surface-variant">{book.author}</p>
               </div>
               <div className="flex flex-col items-end gap-2">
                  <span className="text-[10px] font-bold text-primary">{book.progress}%</span>
                  <span className="text-[10px] text-outline">{book.lastRead}</span>
               </div>
            </div>
         ))}
      </div>
    </motion.div>
  );
}
