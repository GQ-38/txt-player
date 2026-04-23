import { supabase } from './supabaseClient';
import type { User, UserStats } from '../types';

type ProfileRow = {
  id: string;
  name: string;
  phone: string | null;
  avatar_url: string;
  reading_time_minutes: number;
  finished_books: number;
  consecutive_days: number;
  last_check_in_date: string | null;
};

function mapProfileToUser(authUser: any, profile: ProfileRow): User {
  return {
    id: authUser.id,
    name: profile.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || authUser.phone || '读者',
    avatarUrl: profile.avatar_url || '',
    email: authUser.email ?? undefined,
    phone: profile.phone ?? authUser.phone ?? undefined,
    stats: {
      readingTimeMinutes: profile.reading_time_minutes ?? 0,
      finishedBooks: profile.finished_books ?? 0,
      consecutiveDays: profile.consecutive_days ?? 0,
      lastCheckInDate: profile.last_check_in_date ?? null,
    },
  };
}

export async function fetchProfile() {
  const { data: authData } = await supabase.auth.getUser();
  const authUser = authData.user;
  if (!authUser) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle<ProfileRow>();

  if (error) {
    console.error(error);
    return null;
  }

  return data ? mapProfileToUser(authUser, data) : null;
}

export async function ensureProfile(authUser: any): Promise<User | null> {
  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle<ProfileRow>();

  if (fetchError) {
    console.error(fetchError);
    return null;
  }

  if (existing) {
    return mapProfileToUser(authUser, existing);
  }

  const name = authUser.user_metadata?.name || authUser.email?.split('@')[0] || authUser.phone || '读者';
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: authUser.id,
      name,
      phone: authUser.phone ?? null,
      avatar_url: '',
      reading_time_minutes: 0,
      finished_books: 0,
      consecutive_days: 0,
      last_check_in_date: null,
    })
    .select('*')
    .single<ProfileRow>();

  if (error) {
    console.error(error);
    return null;
  }

  return mapProfileToUser(authUser, data);
}

export async function updateProfile(patch: Record<string, any>): Promise<User | null> {
  const { data: authData } = await supabase.auth.getUser();
  const authUser = authData.user;
  if (!authUser) return null;

  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', authUser.id)
    .select('*')
    .single<ProfileRow>();

  if (error) {
    console.error(error);
    return null;
  }

  return mapProfileToUser(authUser, data);
}
