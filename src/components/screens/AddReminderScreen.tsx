'use client'

import React, { useState, useEffect, useRef } from 'react'
import { P } from '../palette'
import { H1, Eyebrow } from '../shared'
import type { NavActions } from '../../types/navigation'
import type { RecurrenceType, Scan } from '../../types/domain'

interface Props {
  nav: NavActions
  preselectedScanId?: string
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        fontSize: 11,
        color: P.inkMute,
        fontFamily: 'var(--font-jetbrains-mono), monospace',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </label>
  )
}

const ACTIONS = ['Water', 'Mist', 'Fertilize', 'Repot', 'Prune']

type SegmentKey = 'once' | 'daily' | 'weekly' | 'custom'
const SEGMENTS: { key: SegmentKey; label: string }[] = [
  { key: 'once', label: 'Once' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'custom', label: 'Custom' },
]

function segmentToRecurrence(s: SegmentKey): RecurrenceType {
  if (s === 'once') return 'none'
  if (s === 'daily') return 'daily'
  if (s === 'weekly') return 'weekly'
  return 'biweekly'
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.round((d.getTime() - now.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function AddReminderScreen({ nav, preselectedScanId }: Props) {
  const [scans, setScans] = useState<Scan[]>([])
  const [selectedScanId, setSelectedScanId] = useState<string | null>(
    preselectedScanId || null
  )
  const [showPlantPicker, setShowPlantPicker] = useState(false)
  const [title, setTitle] = useState('')
  const [selectedAction, setSelectedAction] = useState('')
  const [segment, setSegment] = useState<SegmentKey>('weekly')
  const [intervalDays, setIntervalDays] = useState(10)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    return d.toISOString().slice(0, 10)
  })
  const [notifyTime, setNotifyTime] = useState('09:00')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/scans')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setScans(d)
          if (preselectedScanId && !selectedScanId) setSelectedScanId(preselectedScanId)
        }
      })
      .catch(() => {})
  }, [preselectedScanId, selectedScanId])

  const selectedScan = scans.find((s) => s.id === selectedScanId) || null

  async function save() {
    if (saving) return
    const finalTitle = selectedAction || title.trim()
    if (!finalTitle) {
      setError('Please enter or choose an action.')
      return
    }
    setSaving(true)
    setError(null)

    const [year, month, day] = startDate.split('-').map(Number)
    const [hours, minutes] = notifyTime.split(':').map(Number)
    const dueAt = new Date(year, month - 1, day, hours, minutes).toISOString()

    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: finalTitle,
          scanId: selectedScanId || null,
          dueAt,
          recurrence: segmentToRecurrence(segment),
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || 'Failed to save reminder')
      }
      nav.pop()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save reminder')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: 'transparent',
        fontFamily: 'var(--font-inter-tight), sans-serif',
        color: P.ink,
        position: 'relative',
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(20,28,22,0.45)',
          zIndex: 0,
        }}
        onClick={() => nav.pop()}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 390,
          background: P.bg,
          borderRadius: '24px 24px 0 0',
          padding: '12px 24px 28px',
          zIndex: 1,
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: 40,
            height: 4,
            background: P.line,
            borderRadius: 2,
            margin: '4px auto 18px',
          }}
        />
        <Eyebrow>New reminder</Eyebrow>
        <H1 style={{ fontSize: 26, marginTop: 4 }}>
          <span style={{ fontStyle: 'italic' }}>Remind me</span> to…
        </H1>

        {/* Action input */}
        <div style={{ marginTop: 22 }}>
          <FieldLabel>Action</FieldLabel>
          <div
            style={{
              marginTop: 6,
              padding: '14px 16px',
              background: P.surface,
              border: `1px solid ${P.line}`,
              borderRadius: 12,
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <input
              value={selectedAction || title}
              onChange={(e) => {
                setSelectedAction('')
                setTitle(e.target.value)
              }}
              placeholder="Water deeply"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 16,
                color: P.ink,
                fontFamily: 'var(--font-inter-tight), sans-serif',
              }}
            />
            <span style={{ fontSize: 14, color: P.inkMute }}>✏️</span>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {ACTIONS.map((a) => (
              <button
                key={a}
                onClick={() => {
                  setSelectedAction(a)
                  setTitle('')
                }}
                style={{
                  fontSize: 12,
                  padding: '5px 10px',
                  borderRadius: 999,
                  background: selectedAction === a ? P.primary + '22' : 'transparent',
                  color: selectedAction === a ? P.primary : P.inkSoft,
                  border: `1px solid ${selectedAction === a ? P.primary + '55' : P.line}`,
                  fontFamily: 'var(--font-inter-tight), sans-serif',
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Plant selector — from design */}
        <div style={{ marginTop: 18 }}>
          <FieldLabel>Plant</FieldLabel>
          <button
            onClick={() => setShowPlantPicker(!showPlantPicker)}
            style={{
              marginTop: 6,
              width: '100%',
              padding: '10px 12px',
              background: P.surface,
              border: `1px solid ${P.line}`,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontFamily: 'var(--font-inter-tight), sans-serif',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: selectedScan?.imageUrl
                  ? `url(${selectedScan.imageUrl}) center/cover`
                  : P.line,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: P.ink }}>
                {selectedScan
                  ? selectedScan.speciesCommon || selectedScan.speciesScientific || 'Unknown plant'
                  : 'Choose a plant…'}
              </div>
              {selectedScan && (
                <div style={{ fontSize: 11, color: P.inkMute, marginTop: 1 }}>
                  Last scanned{' '}
                  {formatRelativeDate(selectedScan.createdAt).toLowerCase()}
                </div>
              )}
            </div>
            <span style={{ color: P.inkMute, fontSize: 12 }}>▾</span>
          </button>

          {/* Plant picker dropdown */}
          {showPlantPicker && scans.length > 0 && (
            <div
              style={{
                marginTop: 4,
                background: P.surface,
                border: `1px solid ${P.line}`,
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => {
                  setSelectedScanId(null)
                  setShowPlantPicker(false)
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: !selectedScanId ? P.primary + '12' : 'transparent',
                  border: 'none',
                  borderBottom: `1px solid ${P.line}`,
                  fontFamily: 'var(--font-inter-tight), sans-serif',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    background: P.line,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 14 }}>—</span>
                </div>
                <span style={{ fontSize: 14, color: P.inkSoft }}>No specific plant</span>
              </button>
              {scans.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedScanId(s.id)
                    setShowPlantPicker(false)
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: selectedScanId === s.id ? P.primary + '12' : 'transparent',
                    border: 'none',
                    borderBottom: i < scans.length - 1 ? `1px solid ${P.line}` : 'none',
                    fontFamily: 'var(--font-inter-tight), sans-serif',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      background: s.imageUrl ? `url(${s.imageUrl}) center/cover` : P.line,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: P.ink }}>
                      {s.speciesCommon || s.speciesScientific || 'Unknown plant'}
                    </div>
                    <div style={{ fontSize: 11, color: P.inkMute }}>
                      {formatRelativeDate(s.createdAt).toLowerCase()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recurrence segmented control — from design */}
        <div style={{ marginTop: 18 }}>
          <FieldLabel>Repeats</FieldLabel>
          <div
            style={{
              marginTop: 6,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              background: P.surface,
              border: `1px solid ${P.line}`,
              borderRadius: 12,
              padding: 4,
              gap: 4,
            }}
          >
            {SEGMENTS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSegment(s.key)}
                style={{
                  padding: '10px 0',
                  textAlign: 'center',
                  fontSize: 13,
                  borderRadius: 8,
                  background: segment === s.key ? P.ink : 'transparent',
                  color: segment === s.key ? P.bg : P.ink,
                  fontWeight: segment === s.key ? 600 : 400,
                  border: 'none',
                  fontFamily: 'var(--font-inter-tight), sans-serif',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* "Every X days, starting Today" row — from design */}
          <div
            style={{
              marginTop: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 13, color: P.inkSoft }}>Every</span>
            <input
              type="number"
              min={1}
              value={intervalDays}
              onChange={(e) => setIntervalDays(Math.max(1, parseInt(e.target.value) || 1))}
              style={{
                padding: '6px 14px',
                background: P.surface,
                border: `1px solid ${P.line}`,
                borderRadius: 8,
                fontFamily: 'var(--font-fraunces), serif',
                fontVariationSettings: '"opsz" 144',
                fontSize: 18,
                color: P.ink,
                width: 60,
                textAlign: 'center',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: 13, color: P.inkSoft }}>days, starting</span>
            <div
              style={{ position: 'relative', display: 'inline-block' }}
            >
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  width: '100%',
                  cursor: 'pointer',
                }}
              />
              <div
                style={{
                  padding: '6px 12px',
                  background: P.surface,
                  border: `1px solid ${P.line}`,
                  borderRadius: 8,
                  fontSize: 13,
                  color: P.ink,
                  pointerEvents: 'none',
                }}
              >
                {startDate === new Date().toISOString().slice(0, 10)
                  ? 'Today'
                  : new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
              </div>
            </div>
          </div>
        </div>

        {/* Notify at row — from design */}
        <div
          style={{
            marginTop: 18,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 16px',
            background: P.surface,
            border: `1px solid ${P.line}`,
            borderRadius: 12,
            position: 'relative',
          }}
        >
          <span style={{ fontSize: 14 }}>Notify at</span>
          <div style={{ position: 'relative' }}>
            <input
              ref={timeInputRef}
              type="time"
              value={notifyTime}
              onChange={(e) => setNotifyTime(e.target.value)}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0,
                width: '100%',
                cursor: 'pointer',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-fraunces), serif',
                fontVariationSettings: '"opsz" 144',
                fontSize: 18,
                color: P.ink,
                pointerEvents: 'none',
              }}
            >
              {(() => {
                const [h, m] = notifyTime.split(':').map(Number)
                const ampm = h >= 12 ? 'PM' : 'AM'
                const display = h % 12 || 12
                return `${display}:${String(m).padStart(2, '0')} ${ampm}`
              })()}
            </span>
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: 12,
              fontSize: 13,
              color: P.danger,
              padding: '10px 12px',
              background: P.danger + '12',
              borderRadius: 8,
            }}
          >
            {error}
          </div>
        )}

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
          <button
            onClick={() => nav.pop()}
            style={{
              flex: 1,
              height: 50,
              borderRadius: 14,
              background: 'transparent',
              border: `1px solid ${P.line}`,
              color: P.ink,
              fontFamily: 'var(--font-inter-tight), sans-serif',
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            style={{
              flex: 2,
              height: 50,
              borderRadius: 14,
              background: saving ? P.primary + '88' : P.primary,
              color: P.primaryInk,
              border: 'none',
              fontFamily: 'var(--font-inter-tight), sans-serif',
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {saving ? 'Saving…' : 'Save reminder'}
          </button>
        </div>
      </div>
    </div>
  )
}
