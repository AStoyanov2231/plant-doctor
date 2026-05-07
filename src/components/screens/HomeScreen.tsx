'use client'

import React, { useEffect, useRef, useState } from 'react'
import { P } from '../palette'
import { BottomNav, H1 } from '../shared'
import type { NavActions } from '../../types/navigation'

interface Props {
  nav: NavActions
  onTabChange: (tab: 'home' | 'history' | 'reminders') => void
}

export function HomeScreen({ nav, onTabChange }: Props) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [expanding, setExpanding] = useState(false)

  // Safety net: when the page becomes visible again (camera dismissed),
  // give handleFileChange 300ms to fire first, then collapse the overlay.
  useEffect(() => {
    if (!expanding) return
    function onVisible() {
      if (document.visibilityState === 'visible') {
        setTimeout(() => setExpanding(false), 300)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [expanding])

  function handleCameraClick() {
    if (expanding) return
    setExpanding(true)
    setTimeout(() => cameraInputRef.current?.click(), 450)
  }

  function handleGalleryClick() {
    galleryInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setExpanding(false)
    const file = e.target.files?.[0]
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    nav.push({ name: 'analyzing', file, previewUrl })
  }

  return (
    <>
      {/* Camera expand overlay — grows from button to fill screen */}
      {expanding && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: P.primary,
            zIndex: 998,
            pointerEvents: 'none',
            animation: 'cam-expand 0.45s cubic-bezier(0.4, 0, 0.2, 1) forwards',
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
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Headline — grows to fill space, pushes CTAs down */}
        <div style={{ flex: 1, padding: '36px 24px 0' }}>
          <H1 style={{ marginTop: 10 }}>
            Какво
            <br />
            <span style={{ fontStyle: 'italic', color: P.primary }}>тревожи</span> твоето
            <br />
            растение днес?
          </H1>
        </div>

        {/* CTAs — sits naturally above the nav bar; paddingBottom clears it */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
            paddingBottom: 110,
          }}
        >
          {/* Camera — icon only circle */}
          <button
            onClick={handleCameraClick}
            aria-label="Направи снимка"
            style={{
              width: 68,
              height: 68,
              borderRadius: 999,
              background: P.primary,
              border: 'none',
              display: 'grid',
              placeItems: 'center',
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

          {/* Gallery — text pill, opens picker directly */}
          <button
            onClick={handleGalleryClick}
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
