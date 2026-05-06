'use client'

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { P } from '../palette'
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

const ACTIONS = ['Полив', 'Пръскане', 'Торене', 'Препрасаждане', 'Подрязване']

type SegmentKey = 'once' | 'daily' | 'weekly'
const SEGMENTS: { key: SegmentKey; label: string }[] = [
  { key: 'once', label: 'Веднъж' },
  { key: 'daily', label: 'Ежедневно' },
  { key: 'weekly', label: 'Седмично' },
]

function segmentToRecurrence(s: SegmentKey): RecurrenceType {
  if (s === 'once') return 'none'
  if (s === 'daily') return 'daily'
  return 'weekly'
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.round((d.getTime() - now.getTime()) / 86400000)
  if (diffDays === 0) return 'Днес'
  if (diffDays === 1) return 'Утре'
  return d.toLocaleDateString('bg-BG', { month: 'short', day: 'numeric' })
}

// ─── Drum column ─────────────────────────────────────────────────────────────

const ITEM_H = 58

function DrumColumn({
  items,
  initialIndex,
  onChange,
}: {
  items: string[]
  initialIndex: number
  onChange: (i: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const lastIdx = useRef(initialIndex)

  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = initialIndex * ITEM_H
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onScroll() {
    if (!ref.current) return
    const i = Math.max(0, Math.min(items.length - 1, Math.round(ref.current.scrollTop / ITEM_H)))
    if (i !== lastIdx.current) {
      lastIdx.current = i
      onChange(i)
    }
  }

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      {/* Selection band */}
      <div
        style={{
          position: 'absolute',
          top: ITEM_H,
          left: 6,
          right: 6,
          height: ITEM_H,
          background: P.line,
          borderRadius: 14,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {/* Top fade */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: ITEM_H,
          background: `linear-gradient(to bottom, ${P.bg} 30%, transparent)`,
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />
      {/* Bottom fade */}
      <div
        style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: ITEM_H,
          background: `linear-gradient(to top, ${P.bg} 30%, transparent)`,
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />
      {/* Scrollable drum */}
      <div
        ref={ref}
        onScroll={onScroll}
        style={{
          height: ITEM_H * 3,
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          paddingTop: ITEM_H,
          paddingBottom: ITEM_H,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              height: ITEM_H,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              scrollSnapAlign: 'center',
              fontFamily: 'var(--font-fraunces), serif',
              fontVariationSettings: '"opsz" 144',
              fontSize: 28,
              color: P.ink,
              userSelect: 'none',
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Time picker overlay ──────────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

function TimePickerOverlay({
  value,
  onConfirm,
  onCancel,
}: {
  value: string
  onConfirm: (time: string) => void
  onCancel: () => void
}) {
  const [h, m] = value.split(':').map(Number)
  const [selH, setSelH] = useState(h)
  const [selM, setSelM] = useState(m)

  const display = `${String(selH).padStart(2, '0')}:${String(selM).padStart(2, '0')}`

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      {/* Blurred backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(20,28,22,0.55)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
        onClick={onCancel}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'relative',
          background: P.bg,
          borderRadius: '28px 28px 0 0',
          padding: '16px 28px 48px',
          animation: 'slide-up 0.32s cubic-bezier(0.32,0.72,0,1) forwards',
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: 40,
            height: 4,
            background: P.line,
            borderRadius: 2,
            margin: '0 auto 24px',
          }}
        />

        {/* Large live display */}
        <div
          style={{
            textAlign: 'center',
            fontFamily: 'var(--font-fraunces), serif',
            fontVariationSettings: '"opsz" 144',
            fontSize: 56,
            lineHeight: 1,
            color: P.ink,
            letterSpacing: '-0.03em',
            marginBottom: 28,
          }}
        >
          {display}
        </div>

        {/* Drums */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 0,
          }}
        >
          <DrumColumn
            items={HOURS}
            initialIndex={h}
            onChange={setSelH}
          />
          <div
            style={{
              fontFamily: 'var(--font-fraunces), serif',
              fontVariationSettings: '"opsz" 144',
              fontSize: 36,
              color: P.inkMute,
              paddingBottom: 4,
              flexShrink: 0,
            }}
          >
            :
          </div>
          <DrumColumn
            items={MINUTES}
            initialIndex={m}
            onChange={setSelM}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
          <button
            onClick={onCancel}
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
            Отказ
          </button>
          <button
            onClick={() => onConfirm(`${String(selH).padStart(2, '0')}:${String(selM).padStart(2, '0')}`)}
            style={{
              flex: 2,
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
            Готово
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function AddReminderScreen({ nav, preselectedScanId }: Props) {
  const [scans, setScans] = useState<Scan[]>([])
  const [selectedScanId, setSelectedScanId] = useState<string | null>(preselectedScanId || null)
  const [showPlantPicker, setShowPlantPicker] = useState(false)
  const [title, setTitle] = useState('')
  const [selectedAction, setSelectedAction] = useState('')
  const [segment, setSegment] = useState<SegmentKey>('weekly')
  const [notifyTime, setNotifyTime] = useState('09:00')
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/scans')
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d.scans) ? d.scans : []
        setScans(list)
      })
      .catch(() => {})
  }, [])

  const selectedScan = scans.find((s) => s.id === selectedScanId) || null

  async function save() {
    if (saving) return
    const finalTitle = selectedAction || title.trim()
    if (!finalTitle) {
      setError('Моля, въведи или избери действие.')
      return
    }
    setSaving(true)
    setError(null)

    const today = new Date()
    const [hours, minutes] = notifyTime.split(':').map(Number)
    const dueAt = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes).toISOString()

    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: finalTitle,
          scan_id: selectedScanId || undefined,
          due_at: dueAt,
          recurrence: segmentToRecurrence(segment),
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || 'Неуспешно запазване')
      }
      nav.pop()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неуспешно запазване')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {showTimePicker && (
        <TimePickerOverlay
          value={notifyTime}
          onConfirm={(t) => { setNotifyTime(t); setShowTimePicker(false) }}
          onCancel={() => setShowTimePicker(false)}
        />
      )}

      <div
        style={{
          width: '100%',
          height: '100%',
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
            padding: '12px 24px 40px',
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
              margin: '4px auto 22px',
            }}
          />

          {/* Title */}
          <div
            style={{
              fontFamily: 'var(--font-fraunces), serif',
              fontVariationSettings: '"opsz" 144, "SOFT" 50',
              fontSize: 26,
              lineHeight: 1.1,
            }}
          >
            <span style={{ fontStyle: 'italic' }}>Напомни ми</span> да…
          </div>

          {/* Action input */}
          <div style={{ marginTop: 22 }}>
            <FieldLabel>Действие</FieldLabel>
            <div
              style={{
                marginTop: 6,
                padding: '14px 16px',
                background: P.surface,
                border: `1px solid ${P.line}`,
                borderRadius: 12,
              }}
            >
              <input
                value={selectedAction || title}
                onChange={(e) => { setSelectedAction(''); setTitle(e.target.value) }}
                placeholder="Поливай обилно"
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 16,
                  color: P.ink,
                  fontFamily: 'var(--font-inter-tight), sans-serif',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {ACTIONS.map((a) => (
                <button
                  key={a}
                  onClick={() => { setSelectedAction(a); setTitle('') }}
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

          {/* Plant selector */}
          <div style={{ marginTop: 18 }}>
            <FieldLabel>Растение</FieldLabel>
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
                    ? selectedScan.speciesCommon || selectedScan.speciesScientific || 'Неизвестно растение'
                    : 'Избери растение…'}
                </div>
                {selectedScan && (
                  <div style={{ fontSize: 11, color: P.inkMute, marginTop: 1 }}>
                    Последно сканирано{' '}
                    {formatRelativeDate(selectedScan.createdAt).toLowerCase()}
                  </div>
                )}
              </div>
              <span style={{ color: P.inkMute, fontSize: 12 }}>▾</span>
            </button>

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
                  onClick={() => { setSelectedScanId(null); setShowPlantPicker(false) }}
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
                  <span style={{ fontSize: 14, color: P.inkSoft }}>Без конкретно растение</span>
                </button>
                {scans.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedScanId(s.id); setShowPlantPicker(false) }}
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
                        {s.speciesCommon || s.speciesScientific || 'Неизвестно растение'}
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

          {/* Recurrence */}
          <div style={{ marginTop: 18 }}>
            <FieldLabel>Повторение</FieldLabel>
            <div
              style={{
                marginTop: 6,
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
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
          </div>

          {/* Time row — tapping opens the drum picker */}
          <button
            onClick={() => setShowTimePicker(true)}
            style={{
              marginTop: 18,
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 16px',
              background: P.surface,
              border: `1px solid ${P.line}`,
              borderRadius: 12,
              fontFamily: 'var(--font-inter-tight), sans-serif',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 14, color: P.ink }}>Уведоми в</span>
            <span
              style={{
                fontFamily: 'var(--font-fraunces), serif',
                fontVariationSettings: '"opsz" 144',
                fontSize: 20,
                color: P.ink,
              }}
            >
              {notifyTime}
            </span>
          </button>

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
              Отказ
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
              {saving ? 'Запазване…' : 'Запази напомняне'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
