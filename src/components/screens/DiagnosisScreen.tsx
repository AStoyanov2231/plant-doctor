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

export function DiagnosisScreen({ scan, nav, onScanUpdate }: Props) {
  const [isFavorite, setIsFavorite] = useState(scan.isFavorite)

  const urgencyConfig = {
    high: {
      bg: P.danger + '14',
      border: P.danger,
      dot: P.danger,
      label: 'Address today',
      sub: 'Needs attention soon.',
    },
    medium: {
      bg: P.warn + '14',
      border: P.warn,
      dot: P.warn,
      label: 'Address within a week',
      sub: "Treatable. Not urgent, but don't put it off.",
    },
    low: {
      bg: P.ok + '18',
      border: P.ok,
      dot: P.ok,
      label: 'Looking mostly healthy',
      sub: 'Minor concern only.',
    },
  }
  const urg = urgencyConfig[scan.urgency ?? 'low']

  async function toggleFavorite() {
    const next = !isFavorite
    setIsFavorite(next)
    try {
      await fetch(`/api/scans/${scan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: next }),
      })
      onScanUpdate({ ...scan, isFavorite: next })
    } catch {
      setIsFavorite(!next)
    }
  }

  const matchPct = scan.speciesConfidence
    ? `${Math.round(scan.speciesConfidence * 100)}% MATCH`
    : null

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: P.bg,
        fontFamily: 'var(--font-inter-tight), sans-serif',
        color: P.ink,
        overflowY: 'auto',
        paddingBottom: 80,
      }}
    >
      {/* Hero photo */}
      <div
        style={{
          position: 'relative',
          height: 280,
          margin: '0 16px',
          borderRadius: 22,
          overflow: 'hidden',
        }}
      >
        {scan.imageUrl && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `url(${scan.imageUrl}) center/cover`,
            }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(180deg, transparent 50%, ${P.bg} 100%)`,
          }}
        />
        {/* Back button — top left */}
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
              backdropFilter: 'blur(8px)',
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
        {/* Match badge — top right */}
        {matchPct && (
          <div style={{ position: 'absolute', top: 14, right: 14 }}>
            <div
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(8px)',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                fontSize: 10,
                fontWeight: 600,
                color: '#1F2A22',
                letterSpacing: '0.1em',
              }}
            >
              {matchPct}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '10px 24px 0' }}>
        <Eyebrow>Identified</Eyebrow>
        <H1 style={{ marginTop: 6, fontSize: 30 }}>
          {scan.speciesCommon || scan.speciesScientific || 'Unknown plant'}
          {scan.speciesScientific && scan.speciesCommon && (
            <span
              style={{
                display: 'block',
                fontStyle: 'italic',
                fontSize: 18,
                color: P.inkSoft,
                marginTop: 2,
              }}
            >
              {scan.speciesScientific}
            </span>
          )}
        </H1>

        {scan.urgency && (
          <div
            style={{
              marginTop: 14,
              padding: '12px 14px',
              background: urg.bg,
              borderLeft: `3px solid ${urg.border}`,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                background: urg.dot,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontFamily: 'var(--font-fraunces), serif',
                fontVariationSettings: '"opsz" 144',
                fontWeight: 700,
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              !
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{urg.label}</div>
              <div style={{ fontSize: 12, color: P.inkSoft, marginTop: 1 }}>{urg.sub}</div>
            </div>
          </div>
        )}

        {scan.summary && (
          <p style={{ marginTop: 14, fontSize: 14, lineHeight: 1.55, color: P.inkSoft }}>
            {scan.summary}
          </p>
        )}

        {/* Issues */}
        {scan.likelyIssues.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <Eyebrow>Likely issues · {scan.likelyIssues.length} found</Eyebrow>
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
                      : ['Follow standard care guidelines for this issue.']
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Follow-up suggestions */}
        {scan.followUpQuestions.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <Eyebrow>Ask a follow-up</Eyebrow>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                marginTop: 10,
              }}
            >
              {scan.followUpQuestions.slice(0, 3).map((q, i) => (
                <button
                  key={i}
                  onClick={() => nav.push({ name: 'chat', scan })}
                  style={{
                    textAlign: 'left',
                    background: 'transparent',
                    border: `1px solid ${P.line}`,
                    borderRadius: 12,
                    padding: '12px 14px',
                    fontSize: 13.5,
                    color: P.ink,
                    fontFamily: 'var(--font-inter-tight), sans-serif',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span>{q}</span>
                  <span
                    style={{
                      color: P.primary,
                      fontFamily: 'var(--font-jetbrains-mono), monospace',
                      fontSize: 14,
                    }}
                  >
                    →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky CTA — matches design: Start chat + save/detail icon */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 390,
          padding: '12px 20px 28px',
          background: `linear-gradient(180deg, transparent 0%, ${P.bg} 30%)`,
          display: 'flex',
          gap: 8,
        }}
      >
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
          Start chat
        </button>
        {/* Save / favorite button — download-style SVG from design, wired to favorite */}
        <button
          onClick={toggleFavorite}
          style={{
            width: 50,
            height: 50,
            borderRadius: 14,
            background: isFavorite ? P.primary + '18' : P.surface,
            border: `1px solid ${isFavorite ? P.primary + '55' : P.line}`,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M9 2V11M9 11L5.5 7.5M9 11L12.5 7.5M3 14H15"
              stroke={isFavorite ? P.primary : P.ink}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
