'use client'

import React, { useEffect, useState } from 'react'
import { P } from '../palette'
import { H1, Eyebrow } from '../shared'
import type { NavActions } from '../../types/navigation'
import type { Scan } from '../../types/domain'

const STEPS = [
  'Identifying species',
  'Analyzing leaf health',
  'Cross-checking pests & diseases',
  'Drafting care plan',
]

interface Props {
  file: File
  previewUrl: string
  nav: NavActions
}

export function AnalyzingScreen({ file, previewUrl, nav }: Props) {
  const [activeStep, setActiveStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setActiveStep((s) => Math.min(s + 1, STEPS.length - 1))
    }, 1200)

    const formData = new FormData()
    formData.append('image', file)

    fetch('/api/scan', { method: 'POST', body: formData })
      .then(async (res) => {
        clearInterval(stepTimer)
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Scan failed')
        }
        return res.json() as Promise<Scan>
      })
      .then((scan) => {
        nav.push({ name: 'diagnosis', scan })
      })
      .catch((err) => {
        clearInterval(stepTimer)
        setError(err.message || 'Something went wrong')
      })

    return () => clearInterval(stepTimer)
  }, [file, nav])

  if (error) {
    return (
      <div
        style={{
          width: '100%',
          minHeight: '100vh',
          background: P.bg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          gap: 20,
          fontFamily: 'var(--font-inter-tight), sans-serif',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            background: P.danger + '18',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <span style={{ fontSize: 24 }}>!</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 600, fontSize: 16, color: P.ink }}>Scan failed</div>
          <div style={{ fontSize: 14, color: P.inkSoft, marginTop: 6 }}>{error}</div>
        </div>
        <button
          onClick={() => nav.pop()}
          style={{
            height: 46,
            padding: '0 24px',
            borderRadius: 12,
            background: P.primary,
            color: P.primaryInk,
            border: 'none',
            fontFamily: 'var(--font-inter-tight), sans-serif',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Try again
        </button>
      </div>
    )
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
      <div style={{ padding: '8px 24px 0', display: 'flex', justifyContent: 'space-between' }}>
        <button
          onClick={() => nav.pop()}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            border: `1px solid ${P.line}`,
            background: 'transparent',
            display: 'grid',
            placeItems: 'center',
            fontSize: 14,
            color: P.ink,
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: '20px 24px' }}>
        <div
          style={{
            height: 360,
            borderRadius: 20,
            overflow: 'hidden',
            background: `url(${previewUrl}) center/cover`,
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(0deg, ${P.bg}AA 0%, transparent 50%)`,
            }}
          />
          {/* Scan line */}
          <div
            style={{
              position: 'absolute',
              left: 16,
              right: 16,
              top: '40%',
              height: 2,
              background: P.primary,
              boxShadow: `0 0 16px ${P.primary}, 0 0 4px ${P.primary}`,
              animation: 'scanline 2s ease-in-out infinite',
            }}
          />
          {/* Corner brackets */}
          {[
            { top: 16, left: 16 },
            { top: 16, right: 16 },
            { bottom: 70, left: 16 },
            { bottom: 70, right: 16 },
          ].map((pos, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                ...pos,
                width: 22,
                height: 22,
                borderTop: i < 2 ? `2px solid ${P.primaryInk}` : 'none',
                borderBottom: i >= 2 ? `2px solid ${P.primaryInk}` : 'none',
                borderLeft: i === 0 || i === 2 ? `2px solid ${P.primaryInk}` : 'none',
                borderRight: i === 1 || i === 3 ? `2px solid ${P.primaryInk}` : 'none',
              }}
            />
          ))}
        </div>

        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <Eyebrow color={P.primary}>● Analyzing</Eyebrow>
          <H1 style={{ marginTop: 8, fontSize: 26 }}>
            Reading the <span style={{ fontStyle: 'italic' }}>leaves</span>…
          </H1>
        </div>

        <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {STEPS.map((label, i) => {
            const isDone = i < activeStep
            const isActive = i === activeStep
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: isActive ? P.surface : 'transparent',
                  border: `1px solid ${isActive ? P.line : 'transparent'}`,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    background: isDone ? P.primary : 'transparent',
                    border: `1.5px solid ${isDone ? P.primary : isActive ? P.primary : P.line}`,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  {isDone && (
                    <svg width="9" height="9" viewBox="0 0 9 9">
                      <path
                        d="M1 4.5L3.5 7L8 1.5"
                        stroke={P.primaryInk}
                        strokeWidth="1.6"
                        fill="none"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                  {isActive && (
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        background: P.primary,
                      }}
                    />
                  )}
                </div>
                <span
                  style={{
                    fontSize: 14,
                    color: isDone ? P.inkMute : P.ink,
                    textDecoration: isDone ? 'line-through' : 'none',
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        @keyframes scanline {
          0%, 100% { top: 20%; }
          50% { top: 70%; }
        }
      `}</style>
    </div>
  )
}
