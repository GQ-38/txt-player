import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildAuthResponse, getAuthPayload, requireAuth, type AuthedRequest } from './auth';
import { ensureStorageBucket, supabaseAdmin, supabaseAuth } from './supabase';
import { assert, mapBook, mapFeedback, mapHighlight, mapProfileToUser, normalizeIdentifier, safeFileName } from './utils';

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');
const PORT = Number(process.env.PORT || 4000);
const appOrigin = process.env.APP_ORIGIN || 'http://localhost:3000';

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: appOrigin, credentials: false }));
app.use(express.json({ limit: '10mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' },
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.post('/api/auth/signup', authLimiter, async (req, res, next) => {
  try {
    const { identifier, password, name } = req.body;
    assert(password && password.length >= 6, '密码至少 6 位');
    const payload = getAuthPayload(identifier, password);
    const { data, error } = await supabaseAuth.auth.signUp({
      ...payload,
      options: { data: { name: name || normalizeIdentifier(identifier).raw.split('@')[0] || '读者' } },
    } as any);
    if (error || !data.user) {
      return res.status(400).json({ error: error?.message || '注册失败' });
    }
    if (!data.session) {
      return res.status(200).json({
        requiresConfirmation: true,
        message: '注册成功，请完成邮箱或短信验证后登录',
      });
    }
    res.json(await buildAuthResponse({ user: data.user, session: data.session }));
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/signin', authLimiter, async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    assert(password, '请输入密码');
    const { data, error } = await supabaseAuth.auth.signInWithPassword(getAuthPayload(identifier, password) as any);
    if (error || !data.user || !data.session) {
      return res.status(401).json({ error: error?.message || '账号或密码错误' });
    }
    res.json(await buildAuthResponse({ user: data.user, session: data.session }));
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/request-otp', authLimiter, async (req, res, next) => {
  try {
    const { identifier } = req.body;
    const parsed = normalizeIdentifier(identifier);
    assert(parsed.kind !== 'unknown', '请输入有效的邮箱地址或手机号');
    const { error } = await supabaseAuth.auth.signInWithOtp(
      parsed.kind === 'email'
        ? { email: parsed.raw, options: { shouldCreateUser: true } }
        : { phone: parsed.raw, options: { shouldCreateUser: true } },
    );
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    res.json({ success: true, channel: parsed.kind, normalizedIdentifier: parsed.raw });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/verify-otp', authLimiter, async (req, res, next) => {
  try {
    const { identifier, token } = req.body;
    assert(token && /^\d{4,8}$/.test(String(token)), '请输入正确的验证码');
    const parsed = normalizeIdentifier(identifier);
    assert(parsed.kind !== 'unknown', '请输入有效的邮箱地址或手机号');
    const verifyPayload = parsed.kind === 'email'
      ? { email: parsed.raw, token: String(token), type: 'email' as const }
      : { phone: parsed.raw, token: String(token), type: 'sms' as const };
    const { data, error } = await supabaseAuth.auth.verifyOtp(verifyPayload as any);
    if (error || !data.user || !data.session) {
      return res.status(401).json({ error: error?.message || '验证码无效或已过期' });
    }
    res.json(await buildAuthResponse({ user: data.user, session: data.session }));
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    assert(refreshToken, '缺少 refresh token');
    const { data, error } = await supabaseAuth.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.user || !data.session) {
      return res.status(401).json({ error: error?.message || '会话刷新失败' });
    }
    res.json(await buildAuthResponse({ user: data.user, session: data.session }));
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/signout', async (_req, res) => {
  res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, async (req: AuthedRequest, res) => {
  res.json({ user: mapProfileToUser(req.authUser, req.profile) });
});

app.post('/api/uploads/image', requireAuth, upload.single('file'), async (req: AuthedRequest, res, next) => {
  try {
    assert(req.file, '请先选择图片');
    assert(/^image\/(png|jpeg|jpg|webp)$/.test(req.file!.mimetype), '仅支持 PNG/JPG/WEBP 图片');
    const kind = req.query.kind === 'avatar' ? 'avatar' : 'cover';
    const ext = req.file!.originalname.split('.').pop() || 'png';
    const fileName = `${req.authUser!.id}/${kind}-${Date.now()}-${safeFileName(req.file!.originalname || `upload.${ext}`)}`;
    const { error } = await supabaseAdmin.storage
      .from('public-assets')
      .upload(fileName, req.file!.buffer, {
        contentType: req.file!.mimetype,
        upsert: true,
      });
    if (error) throw error;
    const { data } = supabaseAdmin.storage.from('public-assets').getPublicUrl(fileName);
    res.status(201).json({ path: fileName, publicUrl: data.publicUrl });
  } catch (error) {
    next(error);
  }
});

app.get('/api/books', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('books')
      .select('*')
      .eq('user_id', req.authUser!.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json((data || []).map(mapBook));
  } catch (error) {
    next(error);
  }
});

app.post('/api/books', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const payload = req.body;
    assert(payload.title, '书名不能为空');
    const { data, error } = await supabaseAdmin
      .from('books')
      .insert({
        user_id: req.authUser!.id,
        title: payload.title,
        author: payload.author || '未知作者',
        cover_url: payload.coverUrl || '',
        progress: payload.progress ?? 0,
        last_read: payload.lastRead ?? '刚刚',
        format: payload.format || 'TXT',
        description: payload.description ?? null,
        is_featured: payload.isFeatured ?? false,
        accent_color: payload.accentColor ?? null,
        content: payload.content ?? null,
        chapters: payload.chapters ?? [],
        source_file_url: payload.sourceFileUrl ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    res.status(201).json(mapBook(data));
  } catch (error) {
    next(error);
  }
});

app.patch('/api/books/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const payload = req.body;
    const patch: Record<string, any> = {};
    if (payload.title !== undefined) patch.title = payload.title;
    if (payload.author !== undefined) patch.author = payload.author;
    if (payload.coverUrl !== undefined) patch.cover_url = payload.coverUrl;
    if (payload.progress !== undefined) patch.progress = payload.progress;
    if (payload.lastRead !== undefined) patch.last_read = payload.lastRead;
    if (payload.format !== undefined) patch.format = payload.format;
    if (payload.description !== undefined) patch.description = payload.description;
    if (payload.isFeatured !== undefined) patch.is_featured = payload.isFeatured;
    if (payload.accentColor !== undefined) patch.accent_color = payload.accentColor;
    if (payload.content !== undefined) patch.content = payload.content;
    if (payload.chapters !== undefined) patch.chapters = payload.chapters;
    if (payload.sourceFileUrl !== undefined) patch.source_file_url = payload.sourceFileUrl;

    const { data, error } = await supabaseAdmin
      .from('books')
      .update(patch)
      .eq('id', req.params.id)
      .eq('user_id', req.authUser!.id)
      .select('*')
      .single();
    if (error) throw error;
    res.json(mapBook(data));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/books/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('books')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.authUser!.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/highlights', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('highlights')
      .select('*')
      .eq('user_id', req.authUser!.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json((data || []).map(mapHighlight));
  } catch (error) {
    next(error);
  }
});

app.post('/api/highlights', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const payload = req.body;
    assert(payload.content, '划线内容不能为空');
    const { data, error } = await supabaseAdmin
      .from('highlights')
      .insert({
        user_id: req.authUser!.id,
        book_id: payload.bookId,
        book_title: payload.bookTitle ?? null,
        chapter: payload.chapter || '正文',
        date: payload.date || new Date().toISOString(),
        content: payload.content,
        type: payload.type ?? 'highlight',
        progress: payload.progress ?? null,
        is_bookmark: payload.isBookmark ?? false,
        note: payload.note ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    res.status(201).json(mapHighlight(data));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/highlights', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { content, bookId } = req.query;
    const { error } = await supabaseAdmin
      .from('highlights')
      .delete()
      .eq('user_id', req.authUser!.id)
      .eq('content', content)
      .eq('book_id', bookId);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/feedbacks', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('feedbacks')
      .select('*')
      .eq('user_id', req.authUser!.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json((data || []).map(mapFeedback));
  } catch (error) {
    next(error);
  }
});

app.post('/api/feedbacks', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    assert(req.body.content, '反馈内容不能为空');
    const { data, error } = await supabaseAdmin
      .from('feedbacks')
      .insert({
        user_id: req.authUser!.id,
        user_name: req.profile?.name || req.authUser?.email || req.authUser?.phone || '读者',
        content: req.body.content,
        reply: null,
      })
      .select('*')
      .single();
    if (error) throw error;
    res.status(201).json(mapFeedback(data));
  } catch (error) {
    next(error);
  }
});

app.patch('/api/profile', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const patch: Record<string, any> = {};
    if (req.body.name !== undefined) patch.name = req.body.name;
    if (req.body.avatarUrl !== undefined) patch.avatar_url = req.body.avatarUrl;
    if (req.body.phone !== undefined) patch.phone = req.body.phone;
    if (req.body.readingTimeMinutes !== undefined) patch.reading_time_minutes = req.body.readingTimeMinutes;
    if (req.body.finishedBooks !== undefined) patch.finished_books = req.body.finishedBooks;
    if (req.body.consecutiveDays !== undefined) patch.consecutive_days = req.body.consecutiveDays;
    if (req.body.lastCheckInDate !== undefined) patch.last_check_in_date = req.body.lastCheckInDate;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(patch)
      .eq('id', req.authUser!.id)
      .select('*')
      .single();
    if (error) throw error;
    res.json({ user: mapProfileToUser(req.authUser, data) });
  } catch (error) {
    next(error);
  }
});

app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  const message = error instanceof Error ? error.message : '服务器开小差了';
  res.status(500).json({ error: message });
});

async function start() {
  await ensureStorageBucket('public-assets', true);
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
