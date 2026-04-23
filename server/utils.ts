import type { AppUser } from './types';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const e164Regex = /^\+[1-9]\d{6,14}$/;

export function normalizeIdentifier(value: string) {
  const raw = (value || '').trim();
  if (!raw) return { raw: '', kind: 'unknown' as const };
  if (emailRegex.test(raw)) return { raw: raw.toLowerCase(), kind: 'email' as const };

  const digits = raw.replace(/[\s()-]/g, '');
  if (e164Regex.test(digits)) return { raw: digits, kind: 'phone' as const };
  if (/^1\d{10}$/.test(digits)) return { raw: `+86${digits}`, kind: 'phone' as const };
  return { raw, kind: 'unknown' as const };
}

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function mapProfileToUser(authUser: any, profile: any): AppUser {
  return {
    id: authUser.id,
    email: authUser.email ?? undefined,
    phone: authUser.phone ?? undefined,
    name: profile?.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || authUser.phone || '读者',
    avatarUrl: profile?.avatar_url || '',
    stats: {
      readingTimeMinutes: profile?.reading_time_minutes ?? 0,
      finishedBooks: profile?.finished_books ?? 0,
      consecutiveDays: profile?.consecutive_days ?? 0,
      lastCheckInDate: profile?.last_check_in_date ?? null,
    },
  };
}

export function mapBook(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    author: row.author,
    coverUrl: row.cover_url || '',
    progress: Number(row.progress ?? 0),
    lastRead: row.last_read || '',
    format: row.format || 'TXT',
    description: row.description || undefined,
    isFeatured: row.is_featured ?? false,
    accentColor: row.accent_color || undefined,
    content: row.content || undefined,
    chapters: Array.isArray(row.chapters) ? row.chapters : [],
    sourceFileUrl: row.source_file_url || undefined,
  };
}

export function mapHighlight(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    bookId: row.book_id,
    bookTitle: row.book_title || undefined,
    chapter: row.chapter,
    date: row.date,
    content: row.content,
    type: row.type || undefined,
    progress: row.progress ?? undefined,
    isBookmark: row.is_bookmark ?? false,
    note: row.note || undefined,
  };
}

export function mapFeedback(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    content: row.content,
    timestamp: row.created_at,
    reply: row.reply,
  };
}
