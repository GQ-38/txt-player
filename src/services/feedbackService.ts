import { supabase } from './supabaseClient';
import type { Feedback } from '../types';
import { fetchProfile } from './profileService';

function mapFeedback(row: any): Feedback {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    content: row.content,
    timestamp: row.created_at,
    reply: row.reply ?? null,
  };
}

async function getUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function fetchFeedbacks(): Promise<Feedback[]> {
  const userId = await getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('feedbacks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return (data || []).map(mapFeedback);
}

export async function addFeedback(content: string): Promise<Feedback | null> {
  const userId = await getUserId();
  if (!userId) return null;
  const profile = await fetchProfile();
  const userName = profile?.name || profile?.email || profile?.phone || '读者';

  const { data, error } = await supabase
    .from('feedbacks')
    .insert({
      user_id: userId,
      user_name: userName,
      content,
      reply: null,
    })
    .select('*')
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return mapFeedback(data);
}
