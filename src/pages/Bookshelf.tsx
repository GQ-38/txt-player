import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FileText, Grid3X3, List, Search } from 'lucide-react';
import { useStore } from '../store';
import type { Book, Chapter } from '../types';

type ViewMode = 'grid' | 'list';

export const Bookshelf: React.FC = () => {
  const navigate = useNavigate();
  const { books, addBook } = useStore();

  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [importing, setImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredBooks = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return books;

    return books.filter((book) => {
      const title = book.title?.toLowerCase?.() ?? '';
      const author = book.author?.toLowerCase?.() ?? '';
      return title.includes(keyword) || author.includes(keyword);
    });
  }, [books, query]);

  const handleOpenImport = () => {
    fileInputRef.current?.click();
  };

  const handleReadBook = (bookId: string) => {
    navigate(`/reading/${bookId}`);
  };

  const parseTxtToChapters = (content: string): Chapter[] => {
    const lines = content.split(/\r?\n/);
    const chapters: Chapter[] = [];

    let currentTitle = '正文';
    let currentContent: string[] = [];
    let chapterIndex = 1;

    const chapterRegex =
      /^\s*(第[\d零一二三四五六七八九十百千万两〇○]+[章节回卷部篇]|chapter\s+\d+|#{1,4}\s+.+)/i;

    const pushCurrentChapter = () => {
      const text = currentContent.join('\n').trim();
      if (!text && chapters.length > 0) return;

      chapters.push({
        id: `chapter-${chapterIndex}-${Date.now()}`,
        title: currentTitle,
        page: chapterIndex,
        progress: 0,
        content: text || '',
      });
      chapterIndex += 1;
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (chapterRegex.test(line)) {
        if (currentContent.length > 0 || chapters.length === 0) {
          pushCurrentChapter();
        }
        currentTitle = line.replace(/^#{1,4}\s*/, '') || `第${chapterIndex}章`;
        currentContent = [];
      } else {
        currentContent.push(rawLine);
      }
    }

    if (currentContent.length > 0 || chapters.length === 0) {
      pushCurrentChapter();
    }

    return chapters.length > 0
      ? chapters
      : [
        {
          id: `chapter-1-${Date.now()}`,
          title: '正文',
          page: 1,
          progress: 0,
          content,
        },
      ];
  };

  const handleImportTxt = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.txt')) {
      alert('目前仅支持导入 TXT 文件');
      event.target.value = '';
      return;
    }

    setImporting(true);

    try {
      const content = await file.text();
      const chapters = parseTxtToChapters(content);

      const tempBook: Book = {
        id: `txt-${Date.now()}`,
        title: file.name.replace(/\.txt$/i, ''),
        author: '本地导入',
        coverUrl: '',
        progress: 0,
        lastRead: '刚刚',
        format: 'TXT',
        isFeatured: true,
        description: '',
        accentColor: 'from-tertiary-container to-primary-container',
        content: content.slice(0, 15000),
        chapters,
      };

      const savedBook = await addBook(tempBook);

      if (!savedBook) {
        alert('导入书籍失败');
        return;
      }

      navigate(`/reading/${savedBook.id}`);
    } catch (error) {
      console.error('Import TXT failed:', error);
      alert(error instanceof Error ? error.message : '导入书籍失败');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const safeText = (value?: string, fallback = '') =>
    (value || fallback).replace(/\s+/g, ' ').trim();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f2ec] text-[#1f2a2a]">
      <div className="mx-auto max-w-md px-4 pb-32 pt-4">
        <header className="mb-4 rounded-2xl border border-black/5 bg-white/60 px-4 py-5 shadow-sm">
          <div className="flex items-center justify-center gap-2">
            <BookOpen className="h-6 w-6 text-[#0b4b3f]" />
            <h1 className="text-2xl font-bold tracking-tight text-[#0b4b3f]">避风港书屋</h1>
          </div>
        </header>

        <div className="mb-5 rounded-2xl bg-white/70 p-3 shadow-sm">
          <div className="flex items-center gap-2 rounded-xl border border-black/5 bg-white px-3 py-3">
            <Search className="h-4 w-4 shrink-0 text-black/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索书名、作者或标签..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-black/35"
            />
          </div>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            className="rounded-2xl bg-white/70 px-5 py-3 text-sm font-semibold text-[#1f2a2a] shadow-sm"
          >
            管理书架
          </button>

          <button
            type="button"
            onClick={handleOpenImport}
            disabled={importing}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#0b5c4a] px-5 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileText className="h-4 w-4" />
            {importing ? '导入中...' : '导入 TXT'}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={handleImportTxt}
          />
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[#1f2a2a]">最近阅读</h2>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`rounded-xl p-3 shadow-sm ${viewMode === 'grid' ? 'bg-white text-[#1f2a2a]' : 'bg-white/60 text-black/45'
                }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`rounded-xl p-3 shadow-sm ${viewMode === 'list' ? 'bg-white text-[#1f2a2a]' : 'bg-white/60 text-black/45'
                }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {filteredBooks.length === 0 ? (
          <div className="rounded-3xl bg-transparent px-1 py-16 text-center text-[#394646]">
            <p className="text-xl font-semibold leading-relaxed">书架空空如也，快去发现新书或导入本地书籍吧。</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-4">
            {filteredBooks.map((book) => (
              <button
                key={book.id}
                type="button"
                onClick={() => handleReadBook(book.id)}
                className="overflow-hidden rounded-3xl bg-white/80 text-left shadow-sm transition hover:shadow-md"
              >
                <div className="flex h-full flex-col">
                  <div className="h-36 bg-gradient-to-br from-[#d8e5de] to-[#eef4f1]" />
                  <div className="flex min-h-[128px] flex-1 flex-col justify-between p-4">
                    <div>
                      <h3 className="line-clamp-2 break-words text-base font-bold leading-snug text-[#1f2a2a]">
                        {safeText(book.title, '未命名书籍')}
                      </h3>
                      <p className="mt-1 line-clamp-1 text-sm text-black/55">
                        {safeText(book.author, '未知作者')}
                      </p>
                    </div>
                    <p className="mt-3 text-xs text-black/45">进度 {Math.round(book.progress ?? 0)}%</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBooks.map((book) => (
              <button
                key={book.id}
                type="button"
                onClick={() => handleReadBook(book.id)}
                className="flex w-full items-start gap-4 rounded-3xl bg-white/80 p-4 text-left shadow-sm transition hover:shadow-md"
              >
                <div className="h-20 w-16 shrink-0 rounded-2xl bg-gradient-to-br from-[#d8e5de] to-[#eef4f1]" />
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 break-words text-base font-bold leading-snug text-[#1f2a2a]">
                    {safeText(book.title, '未命名书籍')}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-sm text-black/55">
                    {safeText(book.author, '未知作者')}
                  </p>
                  <p className="mt-2 text-xs text-black/45">进度 {Math.round(book.progress ?? 0)}%</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Bookshelf;
