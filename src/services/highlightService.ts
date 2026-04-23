import { supabase } from './supabaseClient';
import type { Highlight } from '../types';

function mapHighlight(row: any): Highlight {
  return {
    id: row.id,
    userId: row.user_id,
    bookId: row.book_id,
    bookTitle: row.book_title || undefined,
    chapter: row.chapter,
    date: row.date,
    content: row.content,
    type: row.type || 'highlight',
    progress: row.progress == null ? undefined : Number(row.progress),
    isBookmark: !!row.is_bookmark,
    note: row.note || undefined,
  };
}

async function getUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function fetchHighlights(): Promise<Highlight[]> {
  const userId = await getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('highlights')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return (data || []).map(mapHighlight);
}

export async function addHighlight(hl: Omit<Highlight, 'id'>): Promise<Highlight | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from('highlights')
    .insert({
      user_id: userId,
      book_id: hl.bookId,
      book_title: hl.bookTitle ?? null,
      chapter: hl.chapter,
      date: hl.date,
      content: hl.content,
      type: hl.type ?? 'highlight',
      progress: hl.progress ?? null,
      is_bookmark: hl.isBookmark ?? false,
      note: hl.note ?? null,
    })
    .select('*')
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return mapHighlight(data);
}

export async function removeHighlight(content: string, bookId: string): Promise<boolean> {
  const userId = await getUserId();
  if (!userId) return false;

  const { error } = await supabase
    .from('highlights')
    .delete()
    .eq('user_id', userId)
    .eq('content', content)
    .eq('book_id', bookId);

  if (error) {
    console.error(error);
    return false;
  }

  return true;
}
