'use client'

import React, { useRef, useEffect, useState } from 'react'
import { P } from '../palette'
import { BottomNav, H1, Eyebrow } from '../shared'
import type { NavActions } from '../../types/navigation'
import type { Scan } from '../../types/domain'

interface Props {
  nav: NavActions
  onTabChange: (tab: 'home' | 'history' | 'reminders') => void
}

export function HomeScreen({ nav, onTabChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [recentScans, setRecentScans] = useState<Scan[]>([])

  useEffect(() => {
    fetch('/api/scans?limit=4')
      .then((r) => r.json())
      .then((data) => setRecentScans(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    nav.push({ name: 'analyzing', file, previewUrl })
  }

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: P.bg,
        fontFamily: 'var(--font-inter-tight), sans-serif',
        color: P.ink,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '8px 24px 0', flex: 1 }}>
        {/* Header row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              background: P.primary,
              color: P.primaryInk,
              display: 'grid',
              placeItems: 'center',
              fontFamily: 'var(--font-fraunces), serif',
              fontVariationSettings: '"opsz" 144, "SOFT" 50',
              fontSize: 20,
              fontStyle: 'italic',
            }}
          >
            p
          </div>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              border: `1px solid ${P.line}`,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="6" r="2.5" stroke={P.ink} strokeWidth="1.4" />
              <path
                d="M3 14C3 11 5 10 8 10C11 10 13 11 13 14"
                stroke={P.ink}
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Headline */}
        <div style={{ marginTop: 28 }}>
          <Eyebrow>Plant&nbsp;·&nbsp;Doctor</Eyebrow>
          <H1 style={{ marginTop: 10 }}>
            What&apos;s
            <br />
            <span style={{ fontStyle: 'italic', color: P.primary }}>troubling</span> your
            <br />
            plant today?
          </H1>
          <p
            style={{
              marginTop: 14,
              fontSize: 14.5,
              lineHeight: 1.5,
              color: P.inkSoft,
              maxWidth: 280,
            }}
          >
            Snap a photo of a leaf, stem, or the whole plant. We&apos;ll identify it and
            tell you what&apos;s going on.
          </p>
        </div>

        {/* Upload card */}
        <div
          style={{
            marginTop: 22,
            background: P.surface,
            border: `1px solid ${P.line}`,
            borderRadius: 22,
            padding: 18,
          }}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%',
              height: 220,
              borderRadius: 14,
              border: `1.5px dashed ${P.primary}55`,
              background: `repeating-linear-gradient(135deg, ${P.bg}, ${P.bg} 8px, ${P.surface} 8px, ${P.surface} 16px)`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                background: P.primary,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect
                  x="3"
                  y="6"
                  width="18"
                  height="14"
                  rx="2"
                  stroke={P.primaryInk}
                  strokeWidth="1.6"
                />
                <path
                  d="M8 6L9.5 4H14.5L16 6"
                  stroke={P.primaryInk}
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="13" r="3.5" stroke={P.primaryInk} strokeWidth="1.6" />
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: P.ink }}>Take a photo</div>
              <div style={{ fontSize: 12.5, color: P.inkMute, marginTop: 2 }}>
                Or upload from library
              </div>
            </div>
          </button>

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                flex: 1,
                height: 46,
                borderRadius: 12,
                background: P.ink,
                color: P.bg,
                border: 'none',
                fontFamily: 'var(--font-inter-tight), sans-serif',
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: '-0.01em',
              }}
            >
              Choose from library
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: 'transparent',
                border: `1px solid ${P.line}`,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="2.5" y="3" width="13" height="12" rx="1.5" stroke={P.ink} strokeWidth="1.5" />
                <path
                  d="M5.5 1.5V4M12.5 1.5V4M2.5 7H15.5"
                  stroke={P.ink}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Recent scans strip */}
        {recentScans.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <Eyebrow>Recent</Eyebrow>
              <button
                onClick={() => onTabChange('history')}
                style={{
                  fontSize: 12,
                  color: P.primary,
                  fontWeight: 500,
                  background: 'transparent',
                  border: 'none',
                  fontFamily: 'var(--font-inter-tight), sans-serif',
                }}
              >
                View all →
              </button>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 10,
                marginTop: 10,
                overflowX: 'auto',
                paddingBottom: 4,
              }}
            >
              {recentScans.map((scan) => (
                <button
                  key={scan.id}
                  onClick={() => nav.push({ name: 'plant-detail', scan })}
                  style={{
                    width: 72,
                    height: 88,
                    borderRadius: 10,
                    background: scan.imageUrl
                      ? `url(${scan.imageUrl}) center/cover`
                      : P.line,
                    flexShrink: 0,
                    border: `1px solid ${P.line}`,
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ height: 88 }} />

      <BottomNav active="home" onNavigate={onTabChange} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  )
}
