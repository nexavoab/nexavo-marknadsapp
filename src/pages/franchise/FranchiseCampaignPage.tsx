import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFranchiseeData } from '@/hooks/useFranchiseeData'
import {
  FORMAT_LABELS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  groupAssetsByCategory,
  type FormatCategory,
} from '@/lib/formatLabels'
import { Button } from '@/components/ui/button'
import type { Campaign, Asset } from '@/types'
import {
  ArrowLeft,
  Download,
  Loader2,
  ImageIcon,
  FolderOpen,
} from 'lucide-react'

type FilterCategory = 'all' | FormatCategory

export default function FranchiseCampaignPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { fetchCampaignById, fetchCampaignAssets, incrementDownload } = useFranchiseeData()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterCategory>('all')
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!id) return

    async function loadData() {
      setLoading(true)
      try {
        const [campaignData, assetsData] = await Promise.all([
          fetchCampaignById(id!),
          fetchCampaignAssets(id!),
        ])
        setCampaign(campaignData)
        setAssets(assetsData)
      } catch (err) {
        console.error('Failed to load campaign:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id, fetchCampaignById, fetchCampaignAssets])

  async function handleDownload(asset: Asset) {
    if (!asset.public_url) return

    setDownloadingIds((prev) => new Set(prev).add(asset.id))

    try {
      // Increment download counter
      await incrementDownload(asset.id)

      // Fetch and trigger download
      const response = await fetch(asset.public_url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${asset.name}.${asset.mime_type?.split('/')[1] || 'png'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Update local count
      setAssets((prev) =>
        prev.map((a) =>
          a.id === asset.id ? { ...a, download_count: a.download_count + 1 } : a
        )
      )
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev)
        next.delete(asset.id)
        return next
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <FolderOpen className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Kampanj hittades inte</h2>
        <Button variant="outline" onClick={() => navigate('/portal')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Tillbaka till portalen
        </Button>
      </div>
    )
  }

  const groupedAssets = groupAssetsByCategory(assets)
  const filteredGroups =
    filter === 'all'
      ? groupedAssets
      : { [filter]: groupedAssets[filter] } as Record<FormatCategory, Asset[]>

  const hasAssets = Object.values(groupedAssets).some((arr) => arr.length > 0)

  const filterButtons: { value: FilterCategory; label: string }[] = [
    { value: 'all', label: 'Alla' },
    ...CATEGORY_ORDER.filter((cat) => groupedAssets[cat].length > 0).map((cat) => ({
      value: cat,
      label: CATEGORY_LABELS[cat],
    })),
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/portal')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Tillbaka
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
          {campaign.description && (
            <p className="text-gray-500 mt-1">{campaign.description}</p>
          )}
        </div>
      </div>

      {/* Filter buttons */}
      {hasAssets && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-500 self-center mr-2">Filtrera:</span>
          {filterButtons.map((btn) => (
            <Button
              key={btn.value}
              variant={filter === btn.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(btn.value)}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      )}

      {/* Assets by category */}
      {!hasAssets ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Inget material tillgängligt för denna kampanj ännu.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {CATEGORY_ORDER.filter(
            (cat) => filter === 'all' || filter === cat
          ).map((category) => {
            const categoryAssets = filteredGroups[category] ?? []
            if (categoryAssets.length === 0) return null

            return (
              <div key={category}>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {CATEGORY_LABELS[category]}
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryAssets.map((asset) => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      isDownloading={downloadingIds.has(asset.id)}
                      onDownload={() => handleDownload(asset)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface AssetCardProps {
  asset: Asset
  isDownloading: boolean
  onDownload: () => void
}

function AssetCard({ asset, isDownloading, onDownload }: AssetCardProps) {
  const formatInfo = asset.format ? FORMAT_LABELS[asset.format] : null

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Preview */}
      <div className="aspect-video bg-gray-100 relative">
        {asset.thumbnail_url || asset.public_url ? (
          <img
            src={asset.thumbnail_url || asset.public_url!}
            alt={asset.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-gray-300" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 truncate">
          {formatInfo?.label ?? asset.name}
        </h3>
        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
          {formatInfo && <span>{formatInfo.dimensions}</span>}
          {asset.mime_type && (
            <>
              <span>·</span>
              <span className="uppercase">{asset.mime_type.split('/')[1]}</span>
            </>
          )}
        </div>

        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-gray-400">
            {asset.download_count} nedladdning{asset.download_count !== 1 ? 'ar' : ''}
          </span>
          <Button
            size="sm"
            onClick={onDownload}
            disabled={isDownloading || !asset.public_url}
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Download className="w-4 h-4 mr-1" />
                Ladda ner
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
