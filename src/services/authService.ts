import { supabase } from './supabaseClient';
import { ensureProfile } from './profileService';
import type { User } from '../types';

function normalizeIdentifier(input: string) {
  const raw = input.trim();
  if (!raw) return { kind: 'unknown' as const, raw: '' };
  if (raw.includes('@')) return { kind: 'email' as const, raw: raw.toLowerCase() };
  const phone = raw.replace(/[\s()-]/g, '');
  if (/^\+?\d{7,20}$/.test(phone)) return { kind: 'phone' as const, raw: phone };
  return { kind: 'unknown' as const, raw };
}

export async function signUp(
  identifier: string,
  password: string,
  name?: string,
): Promise<{ user: User | null; error: string | null; requiresConfirmation?: boolean }> {
  try {
    const parsed = normalizeIdentifier(identifier);
    if (parsed.kind === 'unknown') {
      return { user: null, error: '请输入有效的邮箱地址或手机号' };
    }

    const payload = parsed.kind === 'email'
      ? { email: parsed.raw, password, options: { data: { name: name || parsed.raw.split('@')[0] || '读者' } } }
      : { phone: parsed.raw, password, options: { data: { name: name || parsed.raw || '读者' } } };

    const { data, error } = await supabase.auth.signUp(payload as any);
    if (error || !data.user) {
      return { user: null, error: error?.message || '注册失败' };
    }

    const user = await ensureProfile(data.user);
    return {
      user,
      error: null,
      requiresConfirmation: !data.session,
    };
  } catch (error) {
    return { user: null, error: error instanceof Error ? error.message : '注册失败' };
  }
}

export async function signIn(
  identifier: string,
  password: string,
): Promise<{ user: User | null; error: string | null }> {
  try {
    const parsed = normalizeIdentifier(identifier);
    if (parsed.kind === 'unknown') {
      return { user: null, error: '请输入有效的邮箱地址或手机号' };
    }

    const credentials = parsed.kind === 'email'
      ? { email: parsed.raw, password }
      : { phone: parsed.raw, password };

    const { data, error } = await supabase.auth.signInWithPassword(credentials as any);
    if (error || !data.user) {
      return { user: null, error: error?.message || '登录失败' };
    }

    const user = await ensureProfile(data.user);
    return { user, error: null };
  } catch (error) {
    return { user: null, error: error instanceof Error ? error.message : '登录失败' };
  }
}

export async function requestOtp(identifier: string): Promise<{ success: boolean; error: string | null; channel?: string; normalizedIdentifier?: string }> {
  try {
    const parsed = normalizeIdentifier(identifier);
    if (parsed.kind === 'unknown') {
      return { success: false, error: '请输入有效的邮箱地址或手机号' };
    }

    const { error } = await supabase.auth.signInWithOtp(
      parsed.kind === 'email'
        ? { email: parsed.raw, options: { shouldCreateUser: true } }
        : { phone: parsed.raw, options: { shouldCreateUser: true } },
    );

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      error: null,
      channel: parsed.kind,
      normalizedIdentifier: parsed.raw,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '验证码发送失败' };
  }
}

export async function verifyOtp(identifier: string, token: string): Promise<{ user: User | null; error: string | null }> {
  try {
    const parsed = normalizeIdentifier(identifier);
    if (parsed.kind === 'unknown') {
      return { user: null, error: '请输入有效的邮箱地址或手机号' };
    }

    const payload = parsed.kind === 'email'
      ? { email: parsed.raw, token, type: 'email' as const }
      : { phone: parsed.raw, token, type: 'sms' as const };

    const { data, error } = await supabase.auth.verifyOtp(payload as any);
    if (error || !data.user) {
      return { user: null, error: error?.message || '验证码登录失败' };
    }

    const user = await ensureProfile(data.user);
    return { user, error: null };
  } catch (error) {
    return { user: null, error: error instanceof Error ? error.message : '验证码登录失败' };
  }
}

export async function signOut(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signOut();
  return { error: error?.message ?? null };
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return ensureProfile(data.user);
  } catch {
    return null;
  }
}
