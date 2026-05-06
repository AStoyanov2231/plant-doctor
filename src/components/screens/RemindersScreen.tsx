'use client'

import React, { useState, useEffect } from 'react'
import { P } from '../palette'
import { BottomNav, H1, Eyebrow } from '../shared'
import type { NavActions } from '../../types/navigation'
import type { Reminder, Scan } from '../../types/domain'

interface Props {
  nav: NavActions
  onTabChange: (tab: 'home' | 'history' | 'reminders') => void
}

function formatDue(iso: string): { label: string; isDue: boolean } {
  const d = new Date(iso)
  const now = new Date()
  const diff = (d.getTime() - now.getTime()) / 1000
  if (diff < 0) return { label: 'СЕГА', isDue: true }
  if (diff < 3600 * 8) return { label: 'ДНЕС', isDue: true }
  if (diff < 86400) return { label: 'ТАЗИ ВЕЧЕР', isDue: true }
  const days = Math.ceil(diff / 86400)
  if (days === 1) return { label: 'УТРЕ', isDue: false }
  return {
    label: d
      .toLocaleDateString('bg-BG', { weekday: 'short', month: 'short', day: 'numeric' })
      .toUpperCase(),
    isDue: false,
  }
}

function recurrenceLabel(r: string): string {
  const m: Record<string, string> = {
    none: 'Веднъж',
    daily: 'Ежедневно',
    weekly: 'Седмично',
    biweekly: 'На две седмици',
    monthly: 'Месечно',
  }
  return m[r] || r
}

function getWeekDays() {
  const today = new Date()
  const dow = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dow + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export function RemindersScreen({ nav, onTabChange }: Props) {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [scanMap, setScanMap] = useState<Record<string, Scan>>({})
  const [loading, setLoading] = useState(true)
  const weekDays = getWeekDays()
  const today = new Date()

  useEffect(() => {
    Promise.all([
      fetch('/api/reminders').then((r) => r.json()),
      fetch('/api/scans').then((r) => r.json()),
    ])
      .then(([rems, scans]) => {
        setReminders(Array.isArray(rems) ? rems : [])
        if (Array.isArray(scans)) {
          const map: Record<string, Scan> = {}
          scans.forEach((s: Scan) => { map[s.id] = s })
          setScanMap(map)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function markDone(reminder: Reminder) {
    const now = new Date().toISOString()
    setReminders((prev) =>
      prev.map((r) => (r.id === reminder.id ? { ...r, doneAt: now } : r))
    )
    try {
      await fetch(`/api/reminders/${reminder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doneAt: now }),
      })
    } catch {
      setReminders((prev) =>
        prev.map((r) => (r.id === reminder.id ? { ...r, doneAt: null } : r))
      )
    }
  }

  const dueToday = reminders.filter((r) => {
    if (r.doneAt) return false
    const d = new Date(r.dueAt)
    return d.toLocaleDateString() === today.toLocaleDateString() || d < today
  })

  const upcoming = reminders.filter((r) => {
    if (r.doneAt) return false
    const d = new Date(r.dueAt)
    return d > today && d.toLocaleDateString() !== today.toLocaleDateString()
  })

  const DAYS = ['П', 'В', 'С', 'Ч', 'П', 'С', 'Н']

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
      <div style={{ padding: '6px 24px 100px', flex: 1 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <div>
            <Eyebrow>{dueToday.length} за днес</Eyebrow>
            <H1 style={{ marginTop: 6 }}>
              <span style={{ fontStyle: 'italic' }}>Календар</span> за грижа
            </H1>
          </div>
          <button
            onClick={() => nav.push({ name: 'new-reminder' })}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              background: P.primary,
              border: 'none',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 2V14M2 8H14"
                stroke={P.primaryInk}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Week strip */}
        <div style={{ display: 'flex', gap: 6, marginTop: 22 }}>
          {weekDays.map((d, i) => {
            const isToday = d.toLocaleDateString() === today.toLocaleDateString()
            const hasDue = reminders.some((r) => {
              const rd = new Date(r.dueAt)
              return rd.toLocaleDateString() === d.toLocaleDateString() && !r.doneAt
            })
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  background: isToday ? P.ink : P.surface,
                  color: isToday ? P.bg : P.ink,
                  border: `1px solid ${isToday ? P.ink : P.line}`,
                  borderRadius: 10,
                  padding: '8px 0',
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-jetbrains-mono), monospace',
                    fontSize: 10,
                    color: isToday ? P.bg : P.inkMute,
                    letterSpacing: '0.06em',
                  }}
                >
                  {DAYS[i]}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-fraunces), serif',
                    fontVariationSettings: '"opsz" 144',
                    fontSize: 16,
                    marginTop: 2,
                  }}
                >
                  {d.getDate()}
                </div>
                {hasDue && (
                  <div
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      background: isToday ? P.bg : P.accent,
                      margin: '4px auto 0',
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Today */}
        <div style={{ marginTop: 24 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 10,
            }}
          >
            <Eyebrow>
              Днес ·{' '}
              {today.toLocaleDateString('bg-BG', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </Eyebrow>
            {dueToday.length > 0 && (
              <span style={{ fontSize: 11.5, color: P.accent, fontWeight: 600 }}>
                {dueToday.length} за изпълнение
              </span>
            )}
          </div>
          {dueToday.length === 0 && !loading && (
            <div
              style={{
                fontSize: 13,
                color: P.inkMute,
                textAlign: 'center',
                padding: '20px 0',
              }}
            >
              Нищо за днес.
            </div>
          )}
          {dueToday.map((r) => {
            const { label } = formatDue(r.dueAt)
            const scan = r.scanId ? scanMap[r.scanId] : undefined
            return (
              <ReminderRow
                key={r.id}
                reminder={r}
                dueLabel={label}
                isDue
                scanImageUrl={scan?.imageUrl}
                plantName={scan?.speciesCommon ?? scan?.speciesScientific ?? undefined}
                onMark={() => markDone(r)}
              />
            )
          })}
        </div>

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <Eyebrow>Предстоящи</Eyebrow>
            <div style={{ marginTop: 10 }}>
              {upcoming.map((r) => {
                const { label } = formatDue(r.dueAt)
                const scan = r.scanId ? scanMap[r.scanId] : undefined
                return (
                  <ReminderRow
                    plantName={scan?.speciesCommon ?? scan?.speciesScientific ?? undefined}
                    key={r.id}
                    reminder={r}
                    dueLabel={label}
                    isDue={false}
                    scanImageUrl={scan?.imageUrl}
                    onMark={() => markDone(r)}
                  />
                )
              })}
            </div>
          </div>
        )}

        {loading && (
          <div
            style={{ color: P.inkMute, fontSize: 13, textAlign: 'center', paddingTop: 40 }}
          >
            Зареждане…
          </div>
        )}
      </div>
      <BottomNav active="reminders" onNavigate={onTabChange} />
    </div>
  )
}

function ReminderRow({
  reminder,
  dueLabel,
  isDue,
  scanImageUrl,
  plantName,
  onMark,
}: {
  reminder: Reminder
  dueLabel: string
  isDue: boolean
  scanImageUrl?: string
  plantName?: string
  onMark: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        background: P.surface,
        border: `1px solid ${P.line}`,
        borderRadius: 14,
        marginBottom: 8,
      }}
    >
      {/* Circular checkbox */}
      <button
        onClick={onMark}
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          border: `1.6px solid ${isDue ? P.accent : P.line}`,
          background: reminder.doneAt ? P.ok : 'transparent',
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {reminder.doneAt && (
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path
              d="M1.5 5L4 7.5L8.5 2.5"
              stroke={P.primaryInk}
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
      {/* Plant thumbnail — from design (44×44) */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 8,
          background: scanImageUrl ? `url(${scanImageUrl}) center/cover` : P.line,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span
            style={{
              fontFamily: 'var(--font-fraunces), serif',
              fontVariationSettings: '"opsz" 144, "SOFT" 50',
              fontSize: 15.5,
              color: P.ink,
            }}
          >
            {reminder.title}
          </span>
          {plantName && (
            <span style={{ fontSize: 12, color: P.inkSoft }}>· {plantName}</span>
          )}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: P.inkMute,
            marginTop: 2,
            fontFamily: 'var(--font-jetbrains-mono), monospace',
            letterSpacing: '0.04em',
            display: 'flex',
            gap: 8,
          }}
        >
          <span style={{ color: isDue ? P.accent : P.inkMute, fontWeight: 600 }}>
            {dueLabel}
          </span>
          <span>·</span>
          <span>{recurrenceLabel(reminder.recurrence)}</span>
        </div>
      </div>
      <button
        style={{
          background: 'transparent',
          border: 'none',
          padding: 6,
          color: P.inkMute,
          fontSize: 16,
        }}
      >
        ⋯
      </button>
    </div>
  )
}
