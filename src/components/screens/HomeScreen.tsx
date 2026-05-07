'use client'

import React, { useEffect, useRef, useState } from 'react'
import { P } from '../palette'
import { BottomNav, H1 } from '../shared'
import type { NavActions } from '../../types/navigation'

type Phase = 'idle' | 'expanding' | 'camera' | 'collapsing'

interface Props {
  nav: NavActions
  onTabChange: (tab: 'home' | 'history' | 'reminders') => void
}

export function HomeScreen({ nav, onTabChange }: Props) {
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')

  function openCamera() {
    if (phase !== 'idle') return
    setPhase('expanding')
    setTimeout(() => setPhase('camera'), 450)
  }

  function handleCapture(file: File) {
    setPhase('idle')
    nav.push({ name: 'analyzing', file, previewUrl: URL.createObjectURL(file) })
  }

  function handleCancelCamera() {
    setPhase('collapsing')
    setTimeout(() => setPhase('idle'), 400)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    nav.push({ name: 'analyzing', file, previewUrl: URL.createObjectURL(file) })
  }

  return (
    <>
      {/* Expand / collapse overlay — green circle that grows from the button */}
      {(phase === 'expanding' || phase === 'collapsing') && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: P.primary,
            zIndex: 998,
            pointerEvents: 'none',
            animation: `${phase === 'expanding' ? 'cam-expand 0.45s' : 'cam-collapse 0.4s'} cubic-bezier(0.4, 0, 0.2, 1) forwards`,
          }}
        />
      )}

      {/* In-browser camera view */}
      {phase === 'camera' && (
        <CameraCapture onCapture={handleCapture} onCancel={handleCancelCamera} />
      )}

      <div
        style={{
          width: '100%',
          height: '100%',
          background: P.bg,
          fontFamily: 'var(--font-inter-tight), sans-serif',
          color: P.ink,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Headline — fills available space, pushes CTAs to bottom */}
        <div style={{ flex: 1, padding: '36px 24px 0' }}>
          <H1 style={{ marginTop: 10 }}>
            Какво
            <br />
            <span style={{ fontStyle: 'italic', color: P.primary }}>тревожи</span> твоето
            <br />
            растение днес?
          </H1>
        </div>

        {/* CTAs — paddingBottom clears the nav bar + safe area */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
            paddingBottom: 110,
          }}
        >
          <button
            onClick={openCamera}
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

          <button
            onClick={() => galleryInputRef.current?.click()}
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

function CameraCapture({
  onCapture,
  onCancel,
}: {
  onCapture: (file: File) => void
  onCancel: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')

  useEffect(() => {
    let active = true
    setReady(false)
    setError(false)
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      .then((s) => {
        if (!active) { s.getTracks().forEach((t) => t.stop()); return }
        setStream(s)
        if (videoRef.current) videoRef.current.srcObject = s
      })
      .catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [facing])

  useEffect(() => () => { stream?.getTracks().forEach((t) => t.stop()) }, [stream])

  function flip() {
    stream?.getTracks().forEach((t) => t.stop())
    setStream(null)
    setFacing((f) => (f === 'environment' ? 'user' : 'environment'))
  }

  function capture() {
    const video = videoRef.current
    if (!video || !ready) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) return
      stream?.getTracks().forEach((t) => t.stop())
      onCapture(new File([blob], 'capture.jpg', { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.92)
  }

  function cancel() {
    stream?.getTracks().forEach((t) => t.stop())
    onCancel()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onCanPlay={() => setReady(true)}
        style={{ flex: 1, width: '100%', objectFit: 'cover' }}
      />

      {error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            color: '#fff',
            fontFamily: 'var(--font-inter-tight), sans-serif',
          }}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
            <path d="M20 12v10M20 28h.01" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: 15, textAlign: 'center', maxWidth: 220, lineHeight: 1.5, opacity: 0.9 }}>
            Камерата не е достъпна.<br />Провери разрешенията.
          </div>
          <button
            onClick={cancel}
            style={{
              marginTop: 4,
              padding: '10px 28px',
              borderRadius: 999,
              background: '#fff',
              color: '#000',
              border: 'none',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'var(--font-inter-tight), sans-serif',
            }}
          >
            Назад
          </button>
        </div>
      )}

      {/* Bottom controls */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingTop: 48,
          paddingLeft: 40,
          paddingRight: 40,
          paddingBottom: 'max(48px, env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.65))',
        }}
      >
        {/* Cancel */}
        <button
          onClick={cancel}
          style={{
            minWidth: 60,
            color: '#fff',
            background: 'transparent',
            border: 'none',
            fontSize: 16,
            fontFamily: 'var(--font-inter-tight), sans-serif',
            fontWeight: 500,
            textAlign: 'left',
            padding: 0,
          }}
        >
          Отказ
        </button>

        {/* Shutter */}
        <button
          onClick={capture}
          disabled={!ready}
          aria-label="Направи снимка"
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            background: ready ? '#fff' : 'rgba(255,255,255,0.35)',
            border: '5px solid rgba(255,255,255,0.3)',
            boxShadow: ready ? '0 0 0 2px rgba(255,255,255,0.6)' : 'none',
            transition: 'background 0.25s, box-shadow 0.25s',
            outline: 'none',
          }}
        />

        {/* Flip camera */}
        <button
          onClick={flip}
          aria-label="Обърни камерата"
          style={{
            minWidth: 60,
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'transparent',
            border: 'none',
            padding: 0,
          }}
        >
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              background: 'rgba(255,255,255,0.15)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path
                d="M3 11C3 6.58 6.58 3 11 3C13.39 3 15.55 4.01 17.07 5.65M19 11C19 15.42 15.42 19 11 19C8.61 19 6.45 17.99 4.93 16.35"
                stroke="white"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <path d="M17 3L17.07 5.65L14.5 6.5" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 19L4.93 16.35L7.5 15.5" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  )
}
