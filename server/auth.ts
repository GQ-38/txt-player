import type { NextFunction, Request, Response } from 'express';
import type { File as MulterFile } from 'multer';
import { supabaseAdmin, supabaseAuth } from './supabase';
import { mapProfileToUser, normalizeIdentifier } from './utils';

export interface AuthedRequest extends Request {
  authUser?: any;
  profile?: any;
  file?: MulterFile;
}

export async function ensureProfile(user: any) {
  const defaultName = user.user_metadata?.name || user.email?.split('@')[0] || user.phone || '读者';
  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: user.id,
      name: defaultName,
      phone: user.phone ?? null,
      avatar_url: '',
      reading_time_minutes: 0,
      finished_books: 0,
      consecutive_days: 0,
      last_check_in_date: null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: '未登录或登录已过期' });

  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: '无效的访问令牌' });
  }

  try {
    const profile = await ensureProfile(data.user);
    req.authUser = data.user;
    req.profile = profile;
    next();
  } catch (profileError) {
    next(profileError);
  }
}

export async function buildAuthResponse(data: { user: any; session: any }) {
  const profile = await ensureProfile(data.user);
  return {
    user: mapProfileToUser(data.user, profile),
    session: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
    },
  };
}

export function getAuthPayload(identifier: string, password?: string) {
  const parsed = normalizeIdentifier(identifier);
  if (parsed.kind === 'email') return { email: parsed.raw, password };
  if (parsed.kind === 'phone') return { phone: parsed.raw, password };
  throw new Error('请输入有效的邮箱地址或手机号');
}
