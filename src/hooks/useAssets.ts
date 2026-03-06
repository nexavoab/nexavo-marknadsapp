/**
 * Asset Storage Hook
 * Hanterar uppladdning och hämtning av assets från Supabase Storage
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Asset, AssetType, TemplateFormat } from '@/types'

interface UploadOptions {
  name: string
  campaignId?: string
  templateId?: string
  type: AssetType
  format?: TemplateFormat
  copyText?: string
}

interface UseAssetsReturn {
  uploadAsset: (dataUrl: string, options: UploadOptions) => Promise<Asset>
  uploadFile: (file: File, options: UploadOptions) => Promise<Asset>
  fetchAssets: (campaignId?: string) => Promise<Asset[]>
  deleteAsset: (assetId: string) => Promise<void>
  uploading: boolean
  error: string | null
}

const BUCKET_NAME = 'campaign-assets'

export function useAssets(): UseAssetsReturn {
  const { appUser } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Laddar upp en data URL (t.ex. från canvas) som asset
   */
  const uploadAsset = useCallback(async (
    dataUrl: string,
    options: UploadOptions
  ): Promise<Asset> => {
    if (!appUser?.organization_id) {
      throw new Error('Ej inloggad')
    }

    setUploading(true)
    setError(null)

    try {
      // Konvertera data URL till Blob
      const response = await fetch(dataUrl)
      const blob = await response.blob()

      return await uploadBlob(blob, options, appUser.organization_id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Uppladdning misslyckades'
      setError(message)
      throw err
    } finally {
      setUploading(false)
    }
  }, [appUser])

  /**
   * Laddar upp en fil direkt
   */
  const uploadFile = useCallback(async (
    file: File,
    options: UploadOptions
  ): Promise<Asset> => {
    if (!appUser?.organization_id) {
      throw new Error('Ej inloggad')
    }

    setUploading(true)
    setError(null)

    try {
      return await uploadBlob(file, options, appUser.organization_id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Uppladdning misslyckades'
      setError(message)
      throw err
    } finally {
      setUploading(false)
    }
  }, [appUser])

  /**
   * Intern funktion för att ladda upp blob och spara metadata
   */
  async function uploadBlob(
    blob: Blob,
    options: UploadOptions,
    organizationId: string
  ): Promise<Asset> {
    // Bestäm filändelse
    const ext = getExtensionFromMime(blob.type)
    const safeName = sanitizeFilename(options.name)
    const path = `${organizationId}/assets/${Date.now()}-${safeName}.${ext}`

    // Ladda upp till Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, blob, {
        upsert: false,
        contentType: blob.type,
      })

    if (uploadError) {
      throw new Error(`Storage error: ${uploadError.message}`)
    }

    // Hämta public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path)

    // Försök hämta bilddimensioner om det är en bild
    let dimensions: { width: number; height: number } | undefined
    if (blob.type.startsWith('image/')) {
      dimensions = await getImageDimensions(blob)
    }

    // Spara metadata i assets-tabellen
    const { data, error } = await supabase
      .from('assets')
      .insert({
        organization_id: organizationId,
        campaign_id: options.campaignId,
        template_id: options.templateId,
        name: options.name,
        type: options.type,
        format: options.format,
        storage_path: path,
        public_url: urlData.publicUrl,
        mime_type: blob.type,
        file_size_bytes: blob.size,
        dimensions,
        copy_text: options.copyText,
        download_count: 0,
      })
      .select()
      .single()

    if (error) {
      // Försök rensa upp filen om metadata-insert misslyckas
      await supabase.storage.from(BUCKET_NAME).remove([path])
      throw new Error(`Database error: ${error.message}`)
    }

    return data as Asset
  }

  /**
   * Hämtar assets för organisationen, valfritt filtrerat på kampanj
   */
  const fetchAssets = useCallback(async (campaignId?: string): Promise<Asset[]> => {
    if (!appUser?.organization_id) {
      throw new Error('Ej inloggad')
    }

    let query = supabase
      .from('assets')
      .select('*')
      .eq('organization_id', appUser.organization_id)
      .order('created_at', { ascending: false })

    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Fetch error: ${error.message}`)
    }

    return data as Asset[]
  }, [appUser])

  /**
   * Tar bort en asset (både fil och metadata)
   */
  const deleteAsset = useCallback(async (assetId: string): Promise<void> => {
    if (!appUser?.organization_id) {
      throw new Error('Ej inloggad')
    }

    // Hämta asset för att få storage path
    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select('storage_path')
      .eq('id', assetId)
      .eq('organization_id', appUser.organization_id)
      .single()

    if (fetchError) {
      throw new Error(`Could not find asset: ${fetchError.message}`)
    }

    // Ta bort fil från storage
    if (asset.storage_path) {
      await supabase.storage.from(BUCKET_NAME).remove([asset.storage_path])
    }

    // Ta bort metadata
    const { error: deleteError } = await supabase
      .from('assets')
      .delete()
      .eq('id', assetId)

    if (deleteError) {
      throw new Error(`Delete error: ${deleteError.message}`)
    }
  }, [appUser])

  return {
    uploadAsset,
    uploadFile,
    fetchAssets,
    deleteAsset,
    uploading,
    error,
  }
}

// ============ Helper Functions ============

function getExtensionFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'application/pdf': 'pdf',
  }
  return map[mimeType] || 'bin'
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50)
}

async function getImageDimensions(blob: Blob): Promise<{ width: number; height: number } | undefined> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.width, height: img.height })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(undefined)
    }

    img.src = url
  })
}
