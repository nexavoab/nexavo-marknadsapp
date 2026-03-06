/**
 * Campaign New Page
 * Sida för att skapa ny kampanj med wizard
 */

import { useNavigate } from 'react-router-dom'
import { CampaignWizard } from '@/components/campaign/CampaignWizard'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

export default function CampaignNewPage() {
  const navigate = useNavigate()

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Back Link */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/hq/campaigns')}
        className="mb-6"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Tillbaka till kampanjer
      </Button>

      {/* Title */}
      <h1 className="text-2xl font-bold mb-8">Ny kampanj</h1>

      {/* Wizard */}
      <CampaignWizard
        onComplete={(campaign) => navigate(`/hq/campaigns/${campaign.id}`)}
      />
    </div>
  )
}
