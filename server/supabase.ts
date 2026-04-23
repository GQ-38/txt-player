import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables.');
}

export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function ensureStorageBucket(name: string, isPublic = true) {
  const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
  if (error) throw error;
  if (buckets?.some((bucket) => bucket.name === name)) return;
  const { error: createError } = await supabaseAdmin.storage.createBucket(name, {
    public: isPublic,
    fileSizeLimit: '10485760',
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'text/plain'],
  });
  if (createError && !/already exists/i.test(createError.message)) {
    throw createError;
  }
}
