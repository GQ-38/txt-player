import React, { createContext, useContext, useState, useEffect } from 'react';
import { Book, Highlight, Feedback, User, UserStats } from './types';
import { ACHIEVEMENT_LEVELS } from './constants';
import { signIn, signOut, getCurrentUser, signUp, requestOtp, verifyOtp } from './services/authService';
import { fetchBooks, addBook as svcAddBook, updateBook as svcUpdateBook, deleteBook as svcDeleteBook } from './services/bookService';
import { fetchHighlights, addHighlight as svcAddHighlight, removeHighlight as svcRemoveHighlight } from './services/highlightService';
import { fetchFeedbacks, addFeedback as svcAddFeedback } from './services/feedbackService';
import { updateProfile } from './services/profileService';

interface TTSState {
  isPlaying: boolean;
  activeParagraphIdx: number;
  currentChapterIndex: number;
  paragraphs: string[];
  bookId: string | null;
  rate: number;
  voice: string | null;
}

interface LoginResult {
  success: boolean;
  error?: string;
  requiresConfirmation?: boolean;
}

interface StoreContextType {
  books: Book[];
  addBook: (book: Book) => Promise<Book | null>;
  deleteBook: (id: string) => Promise<void>;
  updateBook: (id: string, partial: Partial<Book>) => Promise<void>;
  highlights: Highlight[];
  addHighlight: (hl: Highlight) => Promise<void>;
  removeHighlightByContent: (content: string, bookId: string) => Promise<void>;
  feedbacks: Feedback[];
  addFeedback: (content: string) => Promise<void>;
  user: User | null;
  login: (identifier: string, password: string, mode?: 'signin' | 'signup', name?: string) => Promise<LoginResult>;
  requestLoginOtp: (identifier: string) => Promise<LoginResult>;
  verifyLoginOtp: (identifier: string, token: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  updateUser: (partial: Partial<User>) => Promise<void>;
  addReadingTime: (mins: number) => Promise<void>;
  performCheckIn: () => Promise<{ success: boolean; message: string }>;
  layoutPreference: 'grid' | 'list';
  setLayoutPreference: (layout: 'grid' | 'list') => void;
  ttsState: TTSState;
  setTtsState: (partial: Partial<TTSState> | ((prev: TTSState) => TTSState)) => void;
  getUserTitle: () => string;
  theme: 'day' | 'eye' | 'night';
  setTheme: (t: 'day' | 'eye' | 'night') => void;
  followSystemTheme: boolean;
  setFollowSystemTheme: (v: boolean) => void;
  categoryClicks: Record<string, number>;
  incrementCategoryClick: (name: string) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

async function syncProfile(partial: Partial<User> & { stats?: Partial<UserStats> }) {
  const patch: Record<string, any> = {};
  if (partial.name !== undefined) patch.name = partial.name;
  if (partial.avatarUrl !== undefined) patch.avatar_url = partial.avatarUrl;
  if (partial.phone !== undefined) patch.phone = partial.phone;
  if (partial.stats?.readingTimeMinutes !== undefined) patch.reading_time_minutes = partial.stats.readingTimeMinutes;
  if (partial.stats?.finishedBooks !== undefined) patch.finished_books = partial.stats.finishedBooks;
  if (partial.stats?.consecutiveDays !== undefined) patch.consecutive_days = partial.stats.consecutiveDays;
  if (partial.stats?.lastCheckInDate !== undefined) patch.last_check_in_date = partial.stats.lastCheckInDate;
  return updateProfile(patch);
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [layoutPreference, setLayoutPreference] = useState<'grid' | 'list'>('grid');
  const [theme, setTheme] = useState<'day' | 'eye' | 'night'>('eye');
  const [followSystemTheme, setFollowSystemTheme] = useState(true);
  const [categoryClicks, setCategoryClicks] = useState<Record<string, number>>({});
  const [ttsState, setTtsStateOriginal] = useState<TTSState>({
    isPlaying: false,
    activeParagraphIdx: 0,
    currentChapterIndex: 0,
    paragraphs: [],
    bookId: null,
    rate: 1.0,
    voice: null,
  });

  const setTtsState = (partial: Partial<TTSState> | ((prev: TTSState) => TTSState)) => {
    setTtsStateOriginal(prev => typeof partial === 'function' ? partial(prev) : { ...prev, ...partial });
  };

  useEffect(() => {
    const bootstrap = async () => {
      const current = await getCurrentUser();
      if (current) setUser(current);
    };
    bootstrap();
  }, []);

  useEffect(() => {
    if (!user) {
      setBooks([]);
      setHighlights([]);
      setFeedbacks([]);
      return;
    }
    const fetchData = async () => {
      const [fb, bk, hl] = await Promise.all([
        fetchFeedbacks(),
        fetchBooks(),
        fetchHighlights(),
      ]);
      setFeedbacks(fb);
      setBooks(bk);
      setHighlights(hl);
    };
    fetchData();
  }, [user]);

  const addFeedback = async (content: string) => {
    if (!user) return;
    const result = await svcAddFeedback(content);
    if (result) setFeedbacks(prev => [result, ...prev]);
  };

  const addBook = async (book: Book): Promise<Book | null> => {
    const { id: _id, ...payload } = book;
    const saved = await svcAddBook(payload);
    if (saved) {
      setBooks(prev => [saved, ...prev]);
      return saved;
    }
    return null;
  };

  const deleteBook = async (id: string) => {
    const success = await svcDeleteBook(id);
    if (success) setBooks(prev => prev.filter(b => b.id !== id));
  };

  const updateBook = async (id: string, partial: Partial<Book>) => {
    const updated = await svcUpdateBook(id, partial);
    if (!updated) return;
    setBooks(prev => prev.map(book => (book.id === id ? updated : book)));

    if (partial.progress === 100 && user) {
      const target = books.find(b => b.id === id);
      if (target?.progress !== 100) {
        const nextStats = { ...user.stats, finishedBooks: user.stats.finishedBooks + 1 };
        setUser({ ...user, stats: nextStats });
        await syncProfile({ stats: nextStats });
      }
    }
  };

  const addHighlight = async (hl: Highlight) => {
    const { id: _id, ...payload } = hl;
    const saved = await svcAddHighlight(payload);
    if (saved) setHighlights(prev => [saved, ...prev]);
  };

  const removeHighlightByContent = async (content: string, bookId: string) => {
    const success = await svcRemoveHighlight(content, bookId);
    if (success) {
      setHighlights(prev => prev.filter(h => !(h.content === content && h.bookId === bookId)));
    }
  };

  const login = async (identifier: string, password: string, mode: 'signin' | 'signup' = 'signin', name?: string) => {
    const result = mode === 'signup'
      ? await signUp(identifier, password, name)
      : await signIn(identifier, password);
    if (result.user) {
      setUser(result.user);
      return { success: true };
    }
    return { success: false, error: result.error || '登录失败', requiresConfirmation: 'requiresConfirmation' in result ? result.requiresConfirmation : undefined };
  };

  const requestLoginOtp = async (identifier: string) => {
    const result = await requestOtp(identifier);
    return result.success ? { success: true } : { success: false, error: result.error || '发送验证码失败' };
  };

  const verifyLoginOtp = async (identifier: string, token: string) => {
    const result = await verifyOtp(identifier, token);
    if (result.user) {
      setUser(result.user);
      return { success: true };
    }
    return { success: false, error: result.error || '验证码校验失败' };
  };

  const logout = async () => {
    await signOut();
    setUser(null);
  };

  const updateUser = async (partial: Partial<User>) => {
    if (!user) return;
    const merged = {
      ...user,
      ...partial,
      stats: { ...user.stats, ...(partial.stats || {}) },
    };
    setUser(merged);
    await syncProfile({ name: merged.name, avatarUrl: merged.avatarUrl, phone: merged.phone, stats: merged.stats });
  };

  const addReadingTime = async (mins: number) => {
    if (!user) return;
    const stats = { ...user.stats, readingTimeMinutes: user.stats.readingTimeMinutes + mins };
    setUser({ ...user, stats });
    await syncProfile({ stats });
  };

  const performCheckIn = async () => {
    if (!user) return { success: false, message: '请先登录' };
    const today = new Date().toISOString().split('T')[0];
    if (user.stats.lastCheckInDate === today) {
      return { success: false, message: '今日已打卡，明天再来哦！' };
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const isConsecutive = user.stats.lastCheckInDate === yesterday;
    const stats = {
      ...user.stats,
      lastCheckInDate: today,
      consecutiveDays: isConsecutive ? user.stats.consecutiveDays + 1 : 1,
    };
    setUser({ ...user, stats });
    await syncProfile({ stats });
    return { success: true, message: '打卡成功！坚持阅读，遇见更好的自己' };
  };

  const incrementCategoryClick = (name: string) => {
    setCategoryClicks(prev => ({
      ...prev,
      [name]: (prev[name] || 0) + 1
    }));
  };

  const getUserTitle = () => {
    if (!user) return '游客';
    const hours = user.stats.readingTimeMinutes / 60;
    const achieved = [...ACHIEVEMENT_LEVELS].reverse().find(level => hours >= level.minHours);
    return achieved ? achieved.title : ACHIEVEMENT_LEVELS[0].title;
  };

  return (
    <StoreContext.Provider value={{
      books, addBook, deleteBook, updateBook,
      highlights, addHighlight, removeHighlightByContent,
      feedbacks, addFeedback,
      user, login, requestLoginOtp, verifyLoginOtp, logout, updateUser, addReadingTime, performCheckIn, getUserTitle,
      layoutPreference, setLayoutPreference, ttsState, setTtsState,
      theme, setTheme, followSystemTheme, setFollowSystemTheme,
      categoryClicks, incrementCategoryClick
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};
