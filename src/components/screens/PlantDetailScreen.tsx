'use client'

import React, { useState } from 'react'
import { P } from '../palette'
import { H1, Eyebrow, IssueCard } from '../shared'
import type { NavActions } from '../../types/navigation'
import type { Scan } from '../../types/domain'

interface Props {
  scan: Scan
  nav: NavActions
  onScanUpdate: (updated: Scan) => void
}

export function PlantDetailScreen({ scan, nav, onScanUpdate }: Props) {
  const [isFavorite, setIsFavorite] = useState(scan.isFavorite)

  async function toggleFavorite() {
    const next = !isFavorite
    setIsFavorite(next)
    try {
      const res = await fetch(`/api/scans/${scan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: next }),
      })
      if (!res.ok) throw new Error('patch failed')
      onScanUpdate({ ...scan, isFavorite: next })
    } catch {
      setIsFavorite(!next)
    }
  }

  const statusLabel =
    scan.urgency === 'high'
      ? 'НУЖДАЕ СЕ ОТ ВНИМАНИЕ'
      : scan.urgency === 'medium'
      ? 'НАБЛЮДЕНИЕ'
      : 'ЗДРАВО'

  const statusColor =
    scan.urgency === 'high' ? P.danger : scan.urgency === 'medium' ? P.warn : P.ok

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: P.bg,
        fontFamily: 'var(--font-inter-tight), sans-serif',
        color: P.ink,
        overflowY: 'auto',
        paddingBottom: 32,
      }}
    >
      {/* Hero image */}
      <div style={{ position: 'relative', margin: '20px 16px 0' }}>
        <div
          style={{
            height: 320,
            background: scan.imageUrl
              ? `url(${scan.imageUrl}) center/cover`
              : P.line,
            borderRadius: 22,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 14, left: 14 }}>
            <button
              onClick={() => nav.pop()}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                background: 'rgba(255,255,255,0.9)',
                display: 'grid',
                placeItems: 'center',
                border: 'none',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M9 2L4 7L9 12"
                  stroke="#1F2A22"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <div style={{ position: 'absolute', top: 14, right: 14 }}>
            <button
              onClick={toggleFavorite}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                background: 'rgba(255,255,255,0.9)',
                display: 'grid',
                placeItems: 'center',
                border: 'none',
                color: isFavorite ? P.accent : '#1F2A22',
                fontSize: 16,
              }}
            >
              {isFavorite ? '★' : '☆'}
            </button>
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 14,
              left: 14,
              padding: '5px 10px',
              background: 'rgba(255,255,255,0.9)',
              borderRadius: 999,
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: statusColor,
            }}
          >
            ● {statusLabel}
          </div>
        </div>
      </div>

      <div style={{ padding: '18px 24px 28px' }}>
        <H1 style={{ marginTop: 0, fontSize: 28 }}>
          {scan.speciesCommon || scan.speciesScientific || 'Неизвестно растение'}
          {scan.speciesScientific && scan.speciesCommon && (
            <span
              style={{
                display: 'block',
                fontStyle: 'italic',
                fontSize: 16,
                color: P.inkSoft,
                marginTop: 4,
              }}
            >
              {scan.speciesScientific}
            </span>
          )}
        </H1>

        {/* Quick stats grid — from design */}
        <div
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            background: P.surface,
            border: `1px solid ${P.line}`,
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          {[
            { l: 'Светлина', v: scan.careLight ?? 'Няма данни' },
            { l: 'Вода', v: scan.careWater ?? 'Няма данни' },
            { l: 'Токсично', v: scan.careToxic ?? 'Няма данни' },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                padding: '14px 12px',
                borderRight: i < 2 ? `1px solid ${P.line}` : 'none',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontFamily: 'var(--font-jetbrains-mono), monospace',
                  color: P.inkMute,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                {s.l}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-fraunces), serif',
                  fontVariationSettings: '"opsz" 144',
                  fontSize: 14,
                  marginTop: 4,
                  lineHeight: 1.2,
                  color: P.inkSoft,
                }}
              >
                {s.v}
              </div>
            </div>
          ))}
        </div>

        {/* Likely issues */}
        {scan.likelyIssues.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <Eyebrow>Вероятни проблеми · намерени {scan.likelyIssues.length}</Eyebrow>
            <div style={{ marginTop: 12 }}>
              {scan.likelyIssues.map((issue, i) => (
                <IssueCard
                  key={i}
                  title={issue.name}
                  level={issue.probability}
                  why={issue.why}
                  steps={
                    scan.recommendedActions.slice(i * 2, i * 2 + 2).length > 0
                      ? scan.recommendedActions.slice(i * 2, i * 2 + 2)
                      : ['Следвай стандартните насоки за грижа.']
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Care log timeline — from design */}
        <div style={{ marginTop: 24 }}>
          <Eyebrow>Дневник за грижи</Eyebrow>
          <div style={{ marginTop: 12, position: 'relative', paddingLeft: 18 }}>
            <div
              style={{
                position: 'absolute',
                top: 4,
                bottom: 4,
                left: 5,
                width: 1,
                background: P.line,
              }}
            />
            {/* Current scan event */}
            <div
              style={{
                display: 'flex',
                gap: 14,
                paddingBottom: 14,
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: -17,
                  top: 4,
                  width: 11,
                  height: 11,
                  borderRadius: 6,
                  background: P.ok,
                  border: `2px solid ${P.ok}`,
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: 'var(--font-jetbrains-mono), monospace',
                    color: P.inkMute,
                    letterSpacing: '0.06em',
                  }}
                >
                  {new Date(scan.createdAt)
                    .toLocaleDateString('bg-BG', { month: 'short', day: 'numeric' })
                    .toUpperCase()}
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>
                  Диагноза:{' '}
                  {scan.urgency === 'high'
                    ? 'Нуждае се от внимание'
                    : scan.urgency === 'medium'
                    ? 'Има притеснения'
                    : 'Здраво'}
                </div>
                {scan.speciesConfidence && (
                  <div style={{ fontSize: 12.5, color: P.inkSoft, marginTop: 1 }}>
                    Достоверност {Math.round(scan.speciesConfidence * 100)}%
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button
            onClick={() => nav.push({ name: 'chat', scan })}
            style={{
              flex: 1,
              height: 50,
              borderRadius: 14,
              background: P.primary,
              color: P.primaryInk,
              border: 'none',
              fontFamily: 'var(--font-inter-tight), sans-serif',
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            Чат за това растение
          </button>
          <button
            onClick={() => nav.push({ name: 'new-reminder', preselectedScanId: scan.id })}
            style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              background: P.surface,
              border: `1px solid ${P.line}`,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 2V14M2 8H14"
                stroke={P.ink}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
