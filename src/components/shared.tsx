'use client'

import React, { CSSProperties } from 'react'
import { P } from './palette'

/* ------------------------------------------------------------------ */
/* Typography                                                          */
/* ------------------------------------------------------------------ */

export function H1({
  children,
  style,
}: {
  children: React.ReactNode
  style?: CSSProperties
}) {
  return (
    <h1
      style={{
        fontFamily: 'var(--font-fraunces), "Times New Roman", serif',
        fontWeight: 400,
        fontSize: 34,
        lineHeight: 1.05,
        letterSpacing: '-0.02em',
        color: P.ink,
        margin: 0,
        fontVariationSettings: '"opsz" 144, "SOFT" 50',
        ...style,
      }}
    >
      {children}
    </h1>
  )
}

export function Eyebrow({
  children,
  color,
  style,
}: {
  children: React.ReactNode
  color?: string
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-jetbrains-mono), monospace',
        fontSize: 10.5,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: color || P.inkMute,
        fontWeight: 500,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Bottom Nav                                                          */
/* ------------------------------------------------------------------ */

type NavTab = 'home' | 'history' | 'reminders'

const NAV_ITEMS: { key: NavTab; label: string; icon: string }[] = [
  { key: 'home', label: 'Diagnose', icon: 'leaf' },
  { key: 'history', label: 'History', icon: 'list' },
  { key: 'reminders', label: 'Reminders', icon: 'bell' },
]

function NavIcon({ name, on }: { name: string; on: boolean }) {
  const c = on ? P.primary : P.inkMute
  if (name === 'leaf')
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path
          d="M4 18C4 10 10 4 18 4C18 12 12 18 4 18Z"
          stroke={c}
          strokeWidth="1.6"
          fill={on ? c + '22' : 'none'}
          strokeLinejoin="round"
        />
        <path d="M4 18L13 9" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  if (name === 'list')
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="5" cy="6" r="1.4" fill={c} />
        <circle cx="5" cy="11" r="1.4" fill={c} />
        <circle cx="5" cy="16" r="1.4" fill={c} />
        <path
          d="M9 6H18M9 11H18M9 16H15"
          stroke={c}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    )
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path
        d="M5 16C5 11 6 7 11 7C16 7 17 11 17 16Z"
        stroke={c}
        strokeWidth="1.6"
        fill={on ? c + '22' : 'none'}
        strokeLinejoin="round"
      />
      <path
        d="M9 18.5C9.5 19.3 10.2 19.7 11 19.7C11.8 19.7 12.5 19.3 13 18.5"
        stroke={c}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M11 7V5" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function BottomNav({
  active,
  onNavigate,
}: {
  active: NavTab
  onNavigate: (tab: NavTab) => void
}) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: 10,
        paddingBottom: 28,
        background: P.surface,
        borderTop: `1px solid ${P.line}`,
        display: 'flex',
        justifyContent: 'space-around',
        fontFamily: 'var(--font-inter-tight), sans-serif',
        zIndex: 10,
      }}
    >
      {NAV_ITEMS.map((it) => {
        const on = active === it.key
        return (
          <button
            key={it.key}
            onClick={() => onNavigate(it.key)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'transparent',
              border: 'none',
              padding: '4px 12px',
            }}
          >
            <NavIcon name={it.icon} on={on} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.02em',
                color: on ? P.primary : P.inkMute,
                textTransform: 'uppercase',
              }}
            >
              {it.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Issue card                                                          */
/* ------------------------------------------------------------------ */

export function ProbabilityTag({ level }: { level: 'high' | 'medium' | 'low' }) {
  const map = {
    high: { bg: P.danger + '18', fg: P.danger, label: 'High' },
    medium: { bg: P.warn + '22', fg: P.warn, label: 'Medium' },
    low: { bg: P.ok + '22', fg: P.ok, label: 'Low' },
  }
  const s = map[level]
  return (
    <span
      style={{
        fontFamily: 'var(--font-jetbrains-mono), monospace',
        fontSize: 10,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        background: s.bg,
        color: s.fg,
        padding: '4px 8px',
        borderRadius: 999,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      ● {s.label}
    </span>
  )
}

export function IssueCard({
  title,
  level,
  why,
  steps,
}: {
  title: string
  level: 'high' | 'medium' | 'low'
  why: string
  steps: string[]
}) {
  return (
    <div
      style={{
        background: P.surface,
        borderRadius: 16,
        border: `1px solid ${P.line}`,
        padding: 16,
        marginBottom: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-fraunces), serif',
            fontVariationSettings: '"opsz" 144, "SOFT" 50',
            fontSize: 19,
            fontWeight: 400,
            letterSpacing: '-0.01em',
            color: P.ink,
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        <ProbabilityTag level={level} />
      </div>
      <p
        style={{
          fontSize: 13,
          lineHeight: 1.5,
          color: P.inkSoft,
          margin: '8px 0 12px',
        }}
      >
        {why}
      </p>
      <div style={{ borderTop: `1px dashed ${P.line}`, paddingTop: 12 }}>
        <Eyebrow>Do this</Eyebrow>
        <ol
          style={{
            margin: '8px 0 0',
            padding: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {steps.map((s, i) => (
            <li
              key={i}
              style={{
                display: 'flex',
                gap: 10,
                fontSize: 13.5,
                color: P.ink,
                lineHeight: 1.45,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-jetbrains-mono), monospace',
                  fontSize: 11,
                  color: P.primary,
                  fontWeight: 600,
                  marginTop: 2,
                  minWidth: 14,
                }}
              >
                0{i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
