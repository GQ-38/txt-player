import React, { useRef, useState } from 'react';
import { FileText, Grid, List, Trash2, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { BookCard, FeaturedBookCard } from '../components/BookCard';
import { useStore } from '../store';
import { Book, Chapter } from '../types';
import { uploadImage } from '../services/uploadService';

export function Bookshelf() {
  const { books, addBook, deleteBook, updateBook, layoutPreference, setLayoutPreference, user } = useStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [currentCoverBookId, setCurrentCoverBookId] = useState<string | null>(null);
  const [isManageMode, setIsManageMode] = useState(false);

  const handleImportClick = () => {
    if (!user) {
      alert('请先登录后再导入书籍');
      navigate('/auth');
      return;
    }
    fileInputRef.current?.click();
  };

  const featuredBook = books.find(b => b.isFeatured) || books[0];
  const otherBooks = books.filter(b => b.id !== featuredBook?.id);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const content = evt.target?.result as string;
        
        // rudimentary parsing logic for chapters
        const lines = content.split('\n');
        const chapters: Chapter[] = [];
        let currentChapter: Chapter | null = null;
        let currentContent: string[] = [];
        let chapterCount = 0;

        const regex = /^\s*(?:第[零一二三四五六七八九十百千万\digits]+[章回节集卷部]|Chapter\s+\d+|#{1,4}\s+.*)/i;

        lines.forEach((line) => {
          const isMatch = regex.test(line) || /^#{1,4}\s+/.test(line);
          if (isMatch) {
            if (currentChapter) {
              currentChapter.content = currentContent.join('\n');
              chapters.push(currentChapter);
            }
            chapterCount++;
            currentChapter = {
              id: 'chap-' + Date.now() + '-' + chapterCount,
              title: line.replace(/^#+\s*/, '').trim(),
              page: chapterCount,
              progress: 0,
            };
            currentContent = [];
          } else {
             currentContent.push(line);
          }
        });

        if (currentChapter) {
           currentChapter.content = currentContent.join('\n');
           chapters.push(currentChapter);
        } else {
           chapters.push({
              id: 'chap-' + Date.now(),
              title: '全文',
              page: 1,
              progress: 0,
              content: content.substring(0, 50000)
           });
        }

        const newBook: Book = {
          id: 'txt-' + Date.now(),
          title: file.name.replace('.txt', ''),
          author: '本地导入',
          coverUrl: '',
          progress: 0,
          lastRead: '刚刚',
          format: 'TXT',
          isFeatured: true,
          content: chapters[0]?.content?.substring(0, 15000), // First chapter snippet
          chapters: chapters,
          accentColor: 'from-tertiary-container to-primary-container'
        };
        const savedBook = await addBook(newBook);
        if (savedBook) {
          navigate(`/reading/${savedBook.id}`);
        } else {
          alert('导入书籍失败');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleRenameBook = (id: string, currentTitle: string) => {
    const newTitle = prompt('请输入新的书名:', currentTitle);
    if (newTitle && newTitle.trim() !== currentTitle) {
      updateBook(id, { title: newTitle.trim() });
    }
  };

  const handleCoverClick = (id: string) => {
    setCurrentCoverBookId(id);
    coverInputRef.current?.click();
  };

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentCoverBookId) {
      try {
        const publicUrl = await uploadImage(file, 'cover');
        await updateBook(currentCoverBookId, { coverUrl: publicUrl });
      } catch (error) {
        alert(error instanceof Error ? error.message : '封面上传失败');
      } finally {
        setCurrentCoverBookId(null);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-7xl mx-auto px-6 py-8"
    >
      {/* Actions Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="relative w-full md:w-96">
          <input 
            type="text" 
            placeholder="搜索书名、作者或标签..."
            className="w-full px-4 py-3 bg-surface border-b border-outline-variant focus:border-primary focus:ring-0 rounded-t-lg transition-colors text-sm placeholder:text-on-surface-variant/70 shadow-sm"
          />
        </div>
        
        <div className="flex gap-2">
           <button 
             onClick={() => setIsManageMode(!isManageMode)} 
             className={`px-6 py-3 rounded-lg shadow-sm font-bold text-sm transition-all active:scale-95 ${isManageMode ? 'bg-error text-white' : 'bg-surface-variant text-on-surface'}`}
           >
             {isManageMode ? '完成管理' : '管理书架'}
           </button>
           <input 
             type="file" 
             accept=".txt" 
             className="hidden" 
             ref={fileInputRef}
             onChange={handleFileChange}
           />
           <button onClick={handleImportClick} className="flex items-center gap-2 px-6 py-3 bg-primary-container text-on-primary rounded-lg shadow-sm hover:opacity-90 transition-all active:scale-95">
             <FileText size={18} />
             <span className="text-sm font-bold tracking-wider">导入 TXT</span>
           </button>
        </div>
      </div>

      {/* Section Title */}
      <div className="mb-6 flex justify-between items-end">
        <h2 className="text-2xl font-bold text-on-surface">最近阅读</h2>
        <div className="flex gap-2">
          <button 
             onClick={() => setLayoutPreference('grid')}
             className={`p-2 rounded-lg transition-colors ${layoutPreference === 'grid' ? 'text-on-surface-variant bg-surface-variant/50' : 'text-outline bg-transparent hover:bg-surface-variant/30'}`}
          >
            <Grid size={18} />
          </button>
          <button 
             onClick={() => setLayoutPreference('list')}
             className={`p-2 rounded-lg transition-colors ${layoutPreference === 'list' ? 'text-on-surface-variant bg-surface-variant/50' : 'text-outline bg-transparent hover:bg-surface-variant/30'}`}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Bookshelf Grid */}
      {books.length > 0 ? (
        <div className={layoutPreference === 'grid' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6" : "flex flex-col gap-4"}>
          {featuredBook && (
             <div className={`relative group/manage ${layoutPreference === 'grid' ? 'col-span-2 md:col-span-2 row-span-2' : 'h-32'}`}>
                <FeaturedBookCard book={featuredBook} isList={layoutPreference === 'list'} />
                <AnimatePresence>
                   {isManageMode && (
                      <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 rounded-xl backdrop-blur-[2px] flex items-center justify-center gap-4 z-10"
                      >
                         <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRenameBook(featuredBook.id, featuredBook.title); }} className="p-3 bg-white text-primary rounded-full hover:scale-110 transition-transform"><FileText size={20}/></button>
                         <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCoverClick(featuredBook.id); }} className="p-3 bg-white text-primary rounded-full hover:scale-110 transition-transform"><Edit3 size={20}/></button>
                         <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteBook(featuredBook.id); }} className="p-3 bg-error text-white rounded-full hover:scale-110 transition-transform"><Trash2 size={20}/></button>
                      </motion.div>
                   )}
                </AnimatePresence>
             </div>
          )}
          {otherBooks.map((book) => (
             <div key={book.id} className={`relative group/manage ${layoutPreference === 'grid' ? 'h-full' : 'h-24'}`}>
                <BookCard book={book} isList={layoutPreference === 'list'} />
                <AnimatePresence>
                   {isManageMode && (
                      <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className={`absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center ${layoutPreference === 'list' ? 'gap-6' : 'gap-2'} z-10`}
                      >
                         <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRenameBook(book.id, book.title); }} className="p-2 bg-white text-primary rounded-full hover:scale-110 transition-transform shadow-sm"><FileText size={16}/></button>
                         <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCoverClick(book.id); }} className="p-2 bg-white text-primary rounded-full hover:scale-110 transition-transform shadow-sm"><Edit3 size={16}/></button>
                         <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteBook(book.id); }} className="p-2 bg-error text-white rounded-full hover:scale-110 transition-transform shadow-sm"><Trash2 size={16}/></button>
                      </motion.div>
                   )}
                </AnimatePresence>
             </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-on-surface-variant">
           <p>书架空空如也，快去发现新书或导入本地书籍吧。</p>
        </div>
      )}
    </motion.div>
  );
}
