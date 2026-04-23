import { supabase } from './supabaseClient';

export async function uploadImage(file: File, kind: 'avatar' | 'cover'): Promise<string> {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    throw new Error('请先登录');
  }

  const ext = file.name.split('.').pop() || 'png';
  const fileName = `${user.id}/${kind}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('public-assets')
    .upload(fileName, file, { upsert: true, contentType: file.type || undefined });

  if (error) {
    throw new Error(error.message || '图片上传失败');
  }

  const { data } = supabase.storage.from('public-assets').getPublicUrl(fileName);
  return data.publicUrl;
}
