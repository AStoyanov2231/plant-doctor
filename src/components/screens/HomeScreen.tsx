'use client'

import React, { useRef, useState } from 'react'
import { P } from '../palette'
import { BottomNav, H1, Eyebrow } from '../shared'
import type { NavActions } from '../../types/navigation'

interface Props {
  nav: NavActions
  onTabChange: (tab: 'home' | 'history' | 'reminders') => void
}

export function HomeScreen({ nav, onTabChange }: Props) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [triggered, setTriggered] = useState(false)

  function handleTrigger(inputRef: React.RefObject<HTMLInputElement | null>) {
    if (triggered) return
    setTriggered(true)
    setTimeout(() => {
      inputRef.current?.click()
      setTriggered(false)
    }, 280)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    nav.push({ name: 'analyzing', file, previewUrl })
  }

  return (
    <>
      {/* Shutter flash */}
      {triggered && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: P.ink,
            zIndex: 999,
            pointerEvents: 'none',
            animation: 'shutter 0.4s ease-out forwards',
          }}
        />
      )}

      <div
        style={{
          width: '100%',
          height: '100vh',
          background: P.bg,
          fontFamily: 'var(--font-inter-tight), sans-serif',
          color: P.ink,
          position: 'relative',
        }}
      >
        {/* Headline */}
        <div style={{ padding: '36px 24px 0' }}>
          <H1 style={{ marginTop: 10 }}>
            Какво
            <br />
            <span style={{ fontStyle: 'italic', color: P.primary }}>тревожи</span> твоето
            <br />
            растение днес?
          </H1>
        </div>

        {/* CTAs — float above the nav bar (nav is ~80px tall) */}
        <div
          style={{
            position: 'absolute',
            bottom: 100,
            left: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}
        >
          {/* Camera — icon only circle */}
          <button
            onClick={() => handleTrigger(cameraInputRef)}
            aria-label="Направи снимка"
            style={{
              width: 68,
              height: 68,
              borderRadius: 999,
              background: P.primary,
              border: 'none',
              display: 'grid',
              placeItems: 'center',
              animation: triggered ? 'cta-press 0.28s ease-out' : 'none',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <rect x="2" y="8" width="24" height="16" rx="3" stroke={P.primaryInk} strokeWidth="1.8" />
              <path
                d="M9 8L11 5H17L19 8"
                stroke={P.primaryInk}
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <circle cx="14" cy="16" r="4" stroke={P.primaryInk} strokeWidth="1.8" />
            </svg>
          </button>

          {/* Gallery — text pill */}
          <button
            onClick={() => handleTrigger(galleryInputRef)}
            style={{
              height: 42,
              paddingLeft: 24,
              paddingRight: 24,
              borderRadius: 999,
              background: 'transparent',
              color: P.inkSoft,
              border: `1px solid ${P.line}`,
              fontFamily: 'var(--font-inter-tight), sans-serif',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Избери от галерия
          </button>
        </div>

        <BottomNav active="home" onNavigate={onTabChange} />

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </>
  )
}
