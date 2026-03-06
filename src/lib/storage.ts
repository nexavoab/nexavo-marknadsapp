import { supabase } from './supabase'

export async function uploadBrandAsset(
  file: File,
  organizationId: string,
  type: 'logo' | 'logo-dark' | 'icon'
): Promise<string> {
  const ext = file.name.split('.').pop()
  const timestamp = Date.now()
  const path = `${organizationId}/brand/${type}-${timestamp}.${ext}`

  const { error } = await supabase.storage
    .from('brand-assets')
    .upload(path, file, { upsert: true })

  if (error) throw error

  const { data } = supabase.storage
    .from('brand-assets')
    .getPublicUrl(path)

  return data.publicUrl
}

export async function deleteBrandAsset(url: string): Promise<void> {
  // Extract path from public URL
  const match = url.match(/brand-assets\/(.+)$/)
  if (!match) return

  const path = match[1]
  const { error } = await supabase.storage
    .from('brand-assets')
    .remove([path])

  if (error) throw error
}
