export interface UserStats {
  readingTimeMinutes: number;
  finishedBooks: number;
  consecutiveDays: number;
  lastCheckInDate: string | null;
}

export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  email?: string;
  phone?: string;
  stats: UserStats;
}

export interface Chapter {
  id: string;
  title: string;
  page: number;
  progress: number;
  content?: string;
}

export interface Book {
  id: string;
  userId?: string;
  title: string;
  author: string;
  coverUrl: string;
  progress: number;
  lastRead: string;
  format: 'TXT' | 'EPUB';
  description?: string;
  isFeatured?: boolean;
  accentColor?: string;
  content?: string;
  chapters?: Chapter[];
  sourceFileUrl?: string;
}

export interface Highlight {
  id: string;
  userId?: string;
  bookId: string;
  bookTitle?: string;
  chapter: string;
  date: string;
  content: string;
  type?: 'highlight' | 'bookmark_note';
  progress?: number;
  isBookmark?: boolean;
  note?: string;
}

export interface Feedback {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
  reply?: string | null;
}

export interface SessionPayload {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number | null;
}

export interface AuthResponse {
  user: User;
  session: SessionPayload;
}
