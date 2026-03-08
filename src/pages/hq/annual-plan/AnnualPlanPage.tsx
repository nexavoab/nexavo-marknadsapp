import { useState, useMemo } from 'react'
import { useCampaignSlots } from '@/hooks/useCampaignSlots'
import type { CampaignSlotCompat } from '@/hooks/useCampaignSlots'
import { Loader2, AlertCircle, CalendarDays } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Konstanter
// ─────────────────────────────────────────────────────────────────────────────
const months = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"]
const currentMonth = new Date().getMonth()
const primaryColor = "#27796a"

const channelColors: Record<string, string> = {
  "Email": "#6366f1",
  "Meta Ads": "#ef4444",
  "Google Ads": "#14b8a6"
}

const statusColors: Record<string, string> = {
  "Klar": "#22c55e",
  "Pågår": "#f59e0b",
  "Planerad": "#cbd5e1"
}

const seasons = [
  { label: "Vinter", months: [0, 1], color: "#f0f9ff", border: "#bae6fd" },
  { label: "Vår", months: [2, 3, 4], color: "#f0fdf4", border: "#bbf7d0" },
  { label: "Sommar", months: [5, 6, 7], color: "#fffbeb", border: "#fde68a" },
  { label: "Höst", months: [8, 9, 10], color: "#fff7ed", border: "#fed7aa" },
  { label: "Jul", months: [11], color: "#f0f9ff", border: "#bae6fd" },
]

const weeks = [
  { label: "V.1-4", month: 0 }, { label: "V.5-8", month: 1 }, { label: "V.9-13", month: 2 }, { label: "V.14-17", month: 3 },
  { label: "V.18-22", month: 4 }, { label: "V.23-26", month: 5 }, { label: "V.27-30", month: 6 }, { label: "V.31-35", month: 7 },
  { label: "V.36-39", month: 8 }, { label: "V.40-44", month: 9 }, { label: "V.45-48", month: 10 }, { label: "V.49-52", month: 11 },
]

const labelW = 200
const colW = 80

// ─────────────────────────────────────────────────────────────────────────────
// Hjälpfunktioner
// ─────────────────────────────────────────────────────────────────────────────
function getIcon(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('städ') || t.includes('clean') || t.includes('spring') || t.includes('vår')) return "🌱"
  if (t.includes('trädgård') || t.includes('garden')) return "🌿"
  if (t.includes('sommar') || t.includes('summer') || t.includes('semester')) return "☀️"
  if (t.includes('höst') || t.includes('autumn') || t.includes('löv')) return "🍂"
  if (t.includes('jul') || t.includes('christmas') || t.includes('vinter')) return "🎄"
  if (t.includes('rekrytering') || t.includes('franchise')) return "🤝"
  if (t.includes('fönster') || t.includes('window')) return "🪟"
  return "📢"
}

function getChannelLabel(slot: CampaignSlotCompat): string {
  const channel = slot.channels?.[0] ?? 'facebook'
  if (channel === 'google' || channel === 'display') return 'Google Ads'
  if (['facebook', 'instagram', 'linkedin'].includes(channel)) return 'Meta Ads'
  return 'Email'
}

function getStatusLabel(status: CampaignSlotCompat['status']): string {
  switch (status) {
    case 'completed': return 'Klar'
    case 'in_progress': return 'Pågår'
    default: return 'Planerad'
  }
}

function getSeasonForMonth(monthIdx: number) {
  return seasons.find(s => s.months.includes(monthIdx)) ?? seasons[0]
}

interface Campaign {
  id: string
  label: string
  icon: string
  channelLabel: string
  startMonth: number
  endMonth: number
  status: string
  budget?: number
  slot: CampaignSlotCompat
}

function mapSlotToCampaign(slot: CampaignSlotCompat): Campaign {
  return {
    id: slot.id,
    label: slot.title,
    icon: getIcon(slot.title),
    channelLabel: getChannelLabel(slot),
    startMonth: new Date(slot.startDate).getMonth(),
    endMonth: new Date(slot.endDate).getMonth(),
    status: getStatusLabel(slot.status),
    budget: slot.budget,
    slot
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Komponenter
// ─────────────────────────────────────────────────────────────────────────────

function Header({ view, setView }: { view: 'timeline' | 'calendar'; setView: (v: 'timeline' | 'calendar') => void }) {
  return (
    <div style={{
      padding: "24px 32px 16px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-end",
      flexWrap: "wrap",
      gap: 16,
      background: "#ffffff",
      borderBottom: "1px solid #e5e7eb"
    }}>
      <div>
        <div style={{
          fontSize: 11,
          letterSpacing: 1.5,
          color: primaryColor,
          textTransform: "uppercase",
          marginBottom: 4,
          fontWeight: 700
        }}>Seniorbolaget</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 }}>Marknadsplan 2026</h1>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {(["timeline", "calendar"] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "1px solid",
              borderColor: view === v ? primaryColor : "#e5e7eb",
              background: view === v ? `${primaryColor}10` : "#ffffff",
              color: view === v ? primaryColor : "#6b7280",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {v === "timeline" ? "⏤ Tidslinje" : "▦ Kalender"}
          </button>
        ))}
      </div>
    </div>
  )
}

function FilterBar({ filterChannel, setFilterChannel }: { filterChannel: string; setFilterChannel: (c: string) => void }) {
  const channels = ["Alla", "Email", "Meta Ads", "Google Ads"]

  return (
    <div style={{
      padding: "16px 32px",
      display: "flex",
      gap: 12,
      alignItems: "center",
      flexWrap: "wrap",
      background: "#ffffff",
      borderBottom: "1px solid #e5e7eb"
    }}>
      <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500, marginRight: 8 }}>Kanal:</span>
      {channels.map(ch => (
        <button
          key={ch}
          onClick={() => setFilterChannel(ch)}
          style={{
            padding: "6px 14px",
            borderRadius: 20,
            border: "1px solid",
            borderColor: filterChannel === ch
              ? (ch === "Alla" ? primaryColor : channelColors[ch] ?? primaryColor)
              : "#e5e7eb",
            background: filterChannel === ch
              ? `${ch === "Alla" ? primaryColor : channelColors[ch]}15`
              : "#ffffff",
            color: filterChannel === ch
              ? (ch === "Alla" ? primaryColor : channelColors[ch])
              : "#4b5563",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "inherit",
            fontWeight: filterChannel === ch ? 600 : 500,
            display: "flex",
            alignItems: "center",
          }}
        >
          {ch !== "Alla" && (
            <span style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: channelColors[ch],
              marginRight: 8
            }} />
          )}
          {ch}
        </button>
      ))}
      <div style={{ marginLeft: "auto", display: "flex", gap: 16, alignItems: "center" }}>
        {Object.entries(statusColors).map(([s, c]) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
            {s}
          </div>
        ))}
      </div>
    </div>
  )
}

function TimelineView({
  campaigns,
  selected,
  setSelected
}: {
  campaigns: Campaign[]
  selected: string | null
  setSelected: (id: string | null) => void
}) {
  return (
    <div style={{ position: "relative" }}>
      {/* Säsongsrad */}
      <div style={{ display: "flex" }}>
        <div style={{ width: labelW, flexShrink: 0 }} />
        {months.map((_, i) => {
          const season = getSeasonForMonth(i)
          return (
            <div
              key={i}
              style={{
                width: colW,
                height: 24,
                background: season.color,
                borderTop: `2px solid ${season.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 600,
                color: "#6b7280"
              }}
            >
              {i === season.months[0] ? season.label : ""}
            </div>
          )
        })}
      </div>

      {/* Månadsrad (sticky) */}
      <div style={{ display: "flex", position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
        <div style={{ width: labelW, flexShrink: 0, padding: "12px 16px", fontWeight: 600, color: "#374151" }}>
          Kampanj
        </div>
        {months.map((m, i) => (
          <div
            key={i}
            style={{
              width: colW,
              textAlign: "center",
              padding: "12px 0",
              fontSize: 13,
              fontWeight: 500,
              color: i === currentMonth ? primaryColor : "#6b7280",
              position: "relative"
            }}
          >
            {m}
            {i === currentMonth && (
              <div style={{
                position: "absolute",
                bottom: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: 24,
                height: 3,
                background: primaryColor,
                borderRadius: 2
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Kampanjrader */}
      <div style={{ position: "relative" }}>
        {/* Vertikal "nu-linje" */}
        <div style={{
          position: "absolute",
          left: labelW + currentMonth * colW + colW / 2,
          top: 0,
          bottom: 0,
          width: 2,
          background: primaryColor,
          zIndex: 5
        }}>
          <div style={{
            position: "absolute",
            top: -4,
            left: -4,
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: primaryColor
          }} />
        </div>

        {campaigns.map(c => (
          <div
            key={c.id}
            onClick={() => setSelected(c.id === selected ? null : c.id)}
            style={{
              display: "flex",
              alignItems: "center",
              height: 48,
              background: selected === c.id ? "#f8fafc" : "transparent",
              cursor: "pointer",
              borderBottom: "1px solid #f3f4f6"
            }}
          >
            {/* Label kolumn */}
            <div style={{
              width: labelW,
              flexShrink: 0,
              padding: "0 16px",
              display: "flex",
              alignItems: "center",
              gap: 8
            }}>
              <span style={{ fontSize: 18 }}>{c.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#374151", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {c.label}
              </span>
            </div>

            {/* Månadskolumner med bar */}
            <div style={{ display: "flex", position: "relative", flex: 1 }}>
              {months.map((_, i) => {
                const season = getSeasonForMonth(i)
                return (
                  <div
                    key={i}
                    style={{
                      width: colW,
                      height: 48,
                      background: season.color,
                    }}
                  />
                )
              })}

              {/* Kampanj-bar */}
              <div style={{
                position: "absolute",
                left: c.startMonth * colW + 8,
                width: (c.endMonth - c.startMonth + 1) * colW - 16,
                height: 32,
                top: 8,
                borderRadius: 8,
                background: channelColors[c.channelLabel] ?? primaryColor,
                display: "flex",
                alignItems: "center",
                paddingLeft: 12,
                gap: 8,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#ffffff"
                }} />
                <span style={{
                  color: "#ffffff",
                  fontSize: 12,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}>
                  {c.label}
                </span>
              </div>
            </div>
          </div>
        ))}

        {campaigns.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: "#9ca3af" }}>
            Inga kampanjer matchar filtret
          </div>
        )}
      </div>
    </div>
  )
}

function CalendarView({
  campaigns,
  selected,
  setSelected
}: {
  campaigns: Campaign[]
  selected: string | null
  setSelected: (id: string | null) => void
}) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 16,
      padding: 16
    }}>
      {weeks.map((w, idx) => {
        const isCurrent = idx === currentMonth
        const monthCampaigns = campaigns.filter(c => c.startMonth <= idx && c.endMonth >= idx)

        return (
          <div
            key={idx}
            style={{
              background: isCurrent ? `${primaryColor}08` : "#ffffff",
              border: `1px solid ${isCurrent ? primaryColor : "#e5e7eb"}`,
              borderRadius: 12,
              padding: 16,
              minHeight: 140
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>{months[idx]}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>{w.label}</div>
              </div>
              {isCurrent && (
                <span style={{
                  background: primaryColor,
                  color: "#ffffff",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 4
                }}>NU</span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {monthCampaigns.map(c => (
                <div
                  key={c.id}
                  onClick={() => setSelected(c.id === selected ? null : c.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    background: selected === c.id ? "#f1f5f9" : "#f8fafc",
                    borderRadius: 6,
                    cursor: "pointer",
                    borderLeft: `3px solid ${channelColors[c.channelLabel] ?? primaryColor}`
                  }}
                >
                  <span style={{ fontSize: 14 }}>{c.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#374151", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.label}
                  </span>
                  <div style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: statusColors[c.status] ?? "#cbd5e1"
                  }} />
                </div>
              ))}
              {monthCampaigns.length === 0 && (
                <div style={{ fontSize: 12, color: "#cbd5e1", fontStyle: "italic" }}>Inga kampanjer</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DetailPanel({
  campaign,
  onClose
}: {
  campaign: Campaign | null
  onClose: () => void
}) {
  return (
    <div style={{
      width: campaign ? 320 : 0,
      overflow: "hidden",
      transition: "width 0.2s ease-in-out",
      background: "#ffffff",
      borderRadius: 12,
      border: campaign ? "1px solid #e5e7eb" : "none",
      boxShadow: campaign ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
      flexShrink: 0
    }}>
      {campaign && (
        <div style={{ padding: 24, width: 320 }}>
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              background: "none",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              color: "#9ca3af"
            }}
          >×</button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <span style={{ fontSize: 36 }}>{campaign.icon}</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{campaign.label}</div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                {months[campaign.startMonth]} – {months[campaign.endMonth]}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", marginBottom: 4 }}>Kanal</div>
              <span style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: 12,
                background: `${channelColors[campaign.channelLabel]}15`,
                color: channelColors[campaign.channelLabel],
                fontSize: 13,
                fontWeight: 600
              }}>
                {campaign.channelLabel}
              </span>
            </div>

            {campaign.budget && (
              <div>
                <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", marginBottom: 4 }}>Budget</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>
                  {campaign.budget.toLocaleString('sv-SE')} kr
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", marginBottom: 4 }}>Status</div>
              <span style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: 12,
                background: `${statusColors[campaign.status]}20`,
                color: statusColors[campaign.status] === "#cbd5e1" ? "#64748b" : statusColors[campaign.status],
                fontSize: 13,
                fontWeight: 600
              }}>
                {campaign.status}
              </span>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", marginBottom: 4 }}>Ansvarig</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#374151" }}>HQ</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Huvudkomponent
// ─────────────────────────────────────────────────────────────────────────────

export default function AnnualPlanPage() {
  const { slotsCompat, loading, error } = useCampaignSlots()
  const [view, setView] = useState<'timeline' | 'calendar'>('timeline')
  const [filterChannel, setFilterChannel] = useState('Alla')
  const [selected, setSelected] = useState<string | null>(null)

  const campaigns = useMemo(() => {
    return slotsCompat.map(mapSlotToCampaign)
  }, [slotsCompat])

  const filteredCampaigns = useMemo(() => {
    if (filterChannel === 'Alla') return campaigns
    return campaigns.filter(c => c.channelLabel === filterChannel)
  }, [campaigns, filterChannel])

  const selectedCampaign = useMemo(() => {
    return campaigns.find(c => c.id === selected) ?? null
  }, [campaigns, selected])

  if (loading) {
    return (
      <div style={{
        background: "#f8f9fa",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <Loader2 style={{ width: 32, height: 32, animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        background: "#f8f9fa",
        minHeight: "100vh",
        padding: 32
      }}>
        <div style={{
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: 8,
          padding: 16,
          display: "flex",
          alignItems: "center",
          gap: 12
        }}>
          <AlertCircle style={{ width: 20, height: 20, color: "#dc2626" }} />
          <span style={{ color: "#dc2626" }}>{error}</span>
        </div>
      </div>
    )
  }

  if (slotsCompat.length === 0) {
    return (
      <div style={{
        background: "#f8f9fa",
        minHeight: "100vh",
        fontFamily: "'DM Sans','Segoe UI',sans-serif",
        color: "#1f2937",
        display: "flex",
        flexDirection: "column"
      }}>
        <Header view={view} setView={setView} />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
          <div style={{
            background: "#ffffff",
            borderRadius: 16,
            padding: 48,
            textAlign: "center",
            border: "1px solid #e5e7eb"
          }}>
            <div style={{
              width: 64,
              height: 64,
              background: `${primaryColor}10`,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px"
            }}>
              <CalendarDays style={{ width: 32, height: 32, color: primaryColor }} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 8 }}>
              Inga kampanjslots ännu
            </div>
            <div style={{ fontSize: 14, color: "#6b7280" }}>
              Skapa din första kampanjslot för att börja planera årshjulet.
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: "#f8f9fa",
      minHeight: "100vh",
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
      color: "#1f2937",
      display: "flex",
      flexDirection: "column"
    }}>
      <style>{`
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}</style>

      <Header view={view} setView={setView} />
      <FilterBar filterChannel={filterChannel} setFilterChannel={setFilterChannel} />

      <div style={{ display: "flex", flex: 1, overflow: "hidden", padding: "24px", gap: "24px" }}>
        <div style={{
          flex: 1,
          overflow: "auto",
          background: "#ffffff",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
        }}>
          {view === "timeline" ? (
            <TimelineView campaigns={filteredCampaigns} selected={selected} setSelected={setSelected} />
          ) : (
            <CalendarView campaigns={filteredCampaigns} selected={selected} setSelected={setSelected} />
          )}
        </div>

        <DetailPanel campaign={selectedCampaign} onClose={() => setSelected(null)} />
      </div>
    </div>
  )
}
