import { supabase } from './supabaseClient';
import type { Book } from '../types';

function mapBook(row: any): Book {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    author: row.author || '未知作者',
    coverUrl: row.cover_url || '',
    progress: Number(row.progress || 0),
    lastRead: row.last_read || '刚刚',
    format: row.format || 'TXT',
    description: row.description || '',
    isFeatured: !!row.is_featured,
    accentColor: row.accent_color || '',
    content: row.content || '',
    chapters: Array.isArray(row.chapters) ? row.chapters : [],
    sourceFileUrl: row.source_file_url || '',
  };
}

async function getUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function fetchBooks(): Promise<Book[]> {
  const userId = await getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return (data || []).map(mapBook);
}

export async function addBook(book: Omit<Book, 'id'>): Promise<Book | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from('books')
    .insert({
      user_id: userId,
      title: book.title,
      author: book.author || '未知作者',
      cover_url: book.coverUrl || '',
      progress: book.progress ?? 0,
      last_read: book.lastRead ?? '刚刚',
      format: book.format || 'TXT',
      description: book.description ?? null,
      is_featured: book.isFeatured ?? false,
      accent_color: book.accentColor ?? null,
      content: book.content ?? null,
      chapters: book.chapters ?? [],
      source_file_url: book.sourceFileUrl ?? null,
    })
    .select('*')
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return mapBook(data);
}

export async function updateBook(id: string, partial: Partial<Book>): Promise<Book | null> {
  const patch: Record<string, any> = {};
  if (partial.title !== undefined) patch.title = partial.title;
  if (partial.author !== undefined) patch.author = partial.author;
  if (partial.coverUrl !== undefined) patch.cover_url = partial.coverUrl;
  if (partial.progress !== undefined) patch.progress = partial.progress;
  if (partial.lastRead !== undefined) patch.last_read = partial.lastRead;
  if (partial.format !== undefined) patch.format = partial.format;
  if (partial.description !== undefined) patch.description = partial.description;
  if (partial.isFeatured !== undefined) patch.is_featured = partial.isFeatured;
  if (partial.accentColor !== undefined) patch.accent_color = partial.accentColor;
  if (partial.content !== undefined) patch.content = partial.content;
  if (partial.chapters !== undefined) patch.chapters = partial.chapters;
  if (partial.sourceFileUrl !== undefined) patch.source_file_url = partial.sourceFileUrl;

  const { data, error } = await supabase
    .from('books')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return mapBook(data);
}

export async function deleteBook(id: string): Promise<boolean> {
  const { error } = await supabase.from('books').delete().eq('id', id);
  if (error) {
    console.error(error);
    return false;
  }
  return true;
}
