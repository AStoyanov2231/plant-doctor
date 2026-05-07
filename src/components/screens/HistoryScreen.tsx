'use client'

import React, { useState, useEffect } from 'react'
import { P } from '../palette'
import { BottomNav, H1, Eyebrow } from '../shared'
import type { NavActions } from '../../types/navigation'
import type { Scan } from '../../types/domain'

interface Props {
  nav: NavActions
  onTabChange: (tab: 'home' | 'history' | 'reminders') => void
}

type FilterKey = 'all' | 'favorites' | 'attention' | 'healthy'

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 1000
  if (diff < 86400 * 2)
    return 'Днес, ' + d.toLocaleTimeString('bg-BG', { hour: 'numeric', minute: '2-digit' })
  if (diff < 86400 * 7)
    return (
      d.toLocaleDateString('bg-BG', { weekday: 'short' }) +
      ', ' +
      d.toLocaleTimeString('bg-BG', { hour: 'numeric', minute: '2-digit' })
    )
  return d.toLocaleDateString('bg-BG', { month: 'short', day: 'numeric' })
}

function groupByWeek(scans: Scan[]): { label: string; items: Scan[] }[] {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86400 * 1000)
  const thisWeek = scans.filter((s) => new Date(s.createdAt) >= weekAgo)
  const earlier = scans.filter((s) => new Date(s.createdAt) < weekAgo)
  const groups: { label: string; items: Scan[] }[] = []
  if (thisWeek.length) groups.push({ label: 'Тази седмица', items: thisWeek })
  if (earlier.length) groups.push({ label: 'По-рано', items: earlier })
  return groups
}

const urgencyDot: Record<string, string> = {
  high: P.danger,
  medium: P.warn,
  low: P.ok,
}
const urgencyLabel: Record<string, string> = {
  high: 'Висок',
  medium: 'Среден',
  low: 'Здраво',
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Всички' },
  { key: 'favorites', label: '★ Любими' },
  { key: 'attention', label: 'Нуждаещи се' },
  { key: 'healthy', label: 'Здрави' },
]

export function HistoryScreen({ nav, onTabChange }: Props) {
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('all')

  useEffect(() => {
    fetch('/api/scans')
      .then((r) => r.json())
      .then((d) => setScans(Array.isArray(d.scans) ? d.scans : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = scans.filter((s) => {
    if (filter === 'favorites') return s.isFavorite
    if (filter === 'attention') return s.urgency === 'high' || s.urgency === 'medium'
    if (filter === 'healthy') return s.urgency === 'low' || !s.urgency
    return true
  })

  const groups = groupByWeek(filtered)

  async function toggleFavorite(scan: Scan, e: React.MouseEvent) {
    e.stopPropagation()
    const next = !scan.isFavorite
    setScans((prev) => prev.map((s) => (s.id === scan.id ? { ...s, isFavorite: next } : s)))
    try {
      await fetch(`/api/scans/${scan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: next }),
      })
    } catch {
      setScans((prev) => prev.map((s) => (s.id === scan.id ? { ...s, isFavorite: !next } : s)))
    }
  }

  // Empty state
  if (!loading && scans.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: P.bg,
          fontFamily: 'var(--font-inter-tight), sans-serif',
          color: P.ink,
          position: 'relative',
        }}
      >
        <div style={{ padding: '36px 24px 0' }}>
          <H1>История</H1>
        </div>
        <div
          style={{
            margin: '40px 24px 0',
            padding: 32,
            border: `1px dashed ${P.line}`,
            borderRadius: 22,
            background: P.surface,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              background: P.primary + '15',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path
                d="M8 32C8 18 18 8 32 8C32 22 22 32 8 32Z"
                stroke={P.primary}
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path d="M8 32L23 17" stroke={P.primary} strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-fraunces), serif',
                fontVariationSettings: '"opsz" 144, "SOFT" 50',
                fontSize: 22,
                lineHeight: 1.2,
              }}
            >
              Все още няма сканирания
            </div>
            <p
              style={{
                fontSize: 13.5,
                color: P.inkSoft,
                lineHeight: 1.5,
                margin: '8px 0 0',
                maxWidth: 240,
              }}
            >
              Диагностицирай първото си растение и ще запазим хронология на всяка проверка тук.
            </p>
          </div>
          <button
            onClick={() => onTabChange('home')}
            style={{
              marginTop: 6,
              height: 44,
              padding: '0 22px',
              borderRadius: 12,
              background: P.primary,
              color: P.primaryInk,
              border: 'none',
              fontFamily: 'var(--font-inter-tight), sans-serif',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Диагностицирай растение
          </button>
        </div>
        <BottomNav active="history" onNavigate={onTabChange} />
      </div>
    )
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: P.bg,
        fontFamily: 'var(--font-inter-tight), sans-serif',
        color: P.ink,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Fixed header */}
      <div style={{ padding: '36px 24px 0', flexShrink: 0 }}>
        <H1>История</H1>

        {/* Filter chips */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            marginTop: 16,
            overflowX: 'auto',
            paddingBottom: 2,
          }}
        >
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                fontSize: 12,
                padding: '6px 11px',
                borderRadius: 999,
                background: filter === f.key ? P.ink : 'transparent',
                color: filter === f.key ? P.bg : P.inkSoft,
                border: `1px solid ${filter === f.key ? P.ink : P.line}`,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                fontFamily: 'var(--font-inter-tight), sans-serif',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable list — paddingBottom clears the absolute nav */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px 100px',
        }}
      >
        {loading && (
          <div style={{ color: P.inkMute, fontSize: 13, textAlign: 'center', paddingTop: 40 }}>
            Зареждане…
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ color: P.inkMute, fontSize: 13, textAlign: 'center', paddingTop: 40 }}>
            Няма сканирания за този филтър.
          </div>
        )}
        {groups.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {group.items.map((scan) => (
                <div
                  key={scan.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => nav.push({ name: 'plant-detail', scan })}
                  onKeyDown={(e) => e.key === 'Enter' && nav.push({ name: 'plant-detail', scan })}
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    background: P.surface,
                    border: `1px solid ${P.line}`,
                    borderRadius: 14,
                    padding: 10,
                    textAlign: 'left',
                    fontFamily: 'var(--font-inter-tight), sans-serif',
                    width: '100%',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: 60,
                      height: 76,
                      borderRadius: 8,
                      background: scan.imageUrl
                        ? `url(${scan.imageUrl}) center/cover`
                        : P.line,
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: 'var(--font-fraunces), serif',
                          fontVariationSettings: '"opsz" 144, "SOFT" 50',
                          fontSize: 16,
                          lineHeight: 1.1,
                          color: P.ink,
                        }}
                      >
                        {scan.speciesCommon || scan.speciesScientific || 'Неизвестно'}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          marginTop: 4,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            background: urgencyDot[scan.urgency ?? 'low'],
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: 12.5, color: P.inkSoft }}>
                          {scan.likelyIssues[0]?.name || 'Healthy'}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: P.inkMute,
                            fontFamily: 'var(--font-jetbrains-mono), monospace',
                          }}
                        >
                          · {urgencyLabel[scan.urgency ?? 'low']}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: P.inkMute,
                        fontFamily: 'var(--font-jetbrains-mono), monospace',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {formatDate(scan.createdAt)}
                    </div>
                  </div>
                  {/* Star — right center */}
                  <button
                    onClick={(e) => toggleFavorite(scan, e)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '0 4px',
                      color: scan.isFavorite ? P.accent : P.inkMute,
                      fontSize: 18,
                      flexShrink: 0,
                      lineHeight: 1,
                    }}
                  >
                    {scan.isFavorite ? '★' : '☆'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <BottomNav active="history" onNavigate={onTabChange} />
    </div>
  )
}
