'use client'

import React, { useState, useEffect, useRef } from 'react'
import { P } from '../palette'
import type { NavActions } from '../../types/navigation'
import type { Scan, ChatMessage } from '../../types/domain'

interface Props {
  scan: Scan
  nav: NavActions
}

function BotAvatar() {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        background: P.primary,
        color: P.primaryInk,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        fontFamily: 'var(--font-fraunces), serif',
        fontVariationSettings: '"opsz" 144',
        fontSize: 14,
        fontStyle: 'italic',
      }}
    >
      p
    </div>
  )
}

export function ChatScreen({ scan, nav }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const tmpIdRef = useRef(0)

  useEffect(() => {
    fetch(`/api/scans/${scan.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.scan?.chatMessages) setMessages(data.scan.chatMessages)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [scan.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    if (!text.trim() || sending) return
    const optimistic: ChatMessage = {
      id: `tmp-${(tmpIdRef.current += 1)}`,
      scanId: scan.id,
      role: 'user',
      content: text.trim(),
      createdAt: new Date().toISOString(),
    }
    setMessages((m) => [...m, optimistic])
    setInput('')
    setSending(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scan_id: scan.id, message: text.trim() }),
      })
      const data = await res.json()
      if (data.message) {
        setMessages((m) => [...m, data.message as ChatMessage])
      }
    } catch {
      // leave optimistic message visible
    } finally {
      setSending(false)
    }
  }

  const suggestions = scan.followUpQuestions.slice(0, 3)

  // Show suggestion chips after the last bot message
  const lastBotIdx = messages.reduceRight(
    (found, m, i) => (found === -1 && m.role === 'assistant' ? i : found),
    -1
  )

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        background: P.bg,
        fontFamily: 'var(--font-inter-tight), sans-serif',
        color: P.ink,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '6px 16px 14px',
          borderBottom: `1px solid ${P.line}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => nav.pop()}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M13 4L7 10L13 16"
                stroke={P.ink}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: scan.imageUrl
                ? `url(${scan.imageUrl}) center/cover`
                : P.line,
              border: `1px solid ${P.line}`,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: 'var(--font-fraunces), serif',
                fontVariationSettings: '"opsz" 144, "SOFT" 50',
                fontSize: 17,
                lineHeight: 1.1,
              }}
            >
              {scan.speciesCommon || scan.speciesScientific || 'Твоето растение'}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {loading && (
          <div
            style={{ color: P.inkMute, fontSize: 13, textAlign: 'center', marginTop: 20 }}
          >
            Зареждане…
          </div>
        )}

        {/* Date separator */}
        {!loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
            <div style={{ flex: 1, height: 1, background: P.line }} />
            <span
              style={{
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                fontSize: 10,
                color: P.inkMute,
                letterSpacing: '0.1em',
              }}
            >
              {new Date(scan.createdAt).toLocaleDateString('bg-BG', {
                month: 'short',
                day: 'numeric',
              }).toUpperCase()}
            </span>
            <div style={{ flex: 1, height: 1, background: P.line }} />
          </div>
        )}

        {/* Intro message if no history */}
        {!loading && messages.length === 0 && (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <BotAvatar />
              <div
                style={{
                  background: P.surface,
                  border: `1px solid ${P.line}`,
                  padding: '10px 14px',
                  borderRadius: '14px 14px 14px 4px',
                  maxWidth: 280,
                  fontSize: 14,
                  lineHeight: 1.45,
                }}
              >
                {scan.summary ||
                  `Диагностицирах твоето ${scan.speciesCommon || 'растение'}. Попитай ме нещо за грижата.`}
              </div>
            </div>
            {/* Suggestion chips after the intro bot message */}
            {suggestions.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  flexWrap: 'wrap',
                  marginLeft: 36,
                  marginTop: 2,
                }}
              >
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    style={{
                      fontSize: 12,
                      padding: '7px 11px',
                      borderRadius: 999,
                      background: 'transparent',
                      border: `1px solid ${P.primary}55`,
                      color: P.primary,
                      fontFamily: 'var(--font-inter-tight), sans-serif',
                      fontWeight: 500,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Message list */}
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user'
          const isLastBot = idx === lastBotIdx
          return (
            <React.Fragment key={msg.id}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  gap: 8,
                  alignItems: 'flex-end',
                }}
              >
                {!isUser && <BotAvatar />}
                <div
                  style={{
                    background: isUser ? P.ink : P.surface,
                    color: isUser ? P.bg : P.ink,
                    border: isUser ? 'none' : `1px solid ${P.line}`,
                    padding: '10px 14px',
                    borderRadius: isUser
                      ? '14px 14px 4px 14px'
                      : '14px 14px 14px 4px',
                    maxWidth: 280,
                    fontSize: 14,
                    lineHeight: 1.45,
                  }}
                >
                  {msg.content}
                </div>
              </div>
              {/* Suggestion chips after last bot message */}
              {isLastBot && !sending && suggestions.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    flexWrap: 'wrap',
                    marginLeft: 36,
                    marginTop: 2,
                  }}
                >
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      style={{
                        fontSize: 12,
                        padding: '7px 11px',
                        borderRadius: 999,
                        background: 'transparent',
                        border: `1px solid ${P.primary}55`,
                        color: P.primary,
                        fontFamily: 'var(--font-inter-tight), sans-serif',
                        fontWeight: 500,
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </React.Fragment>
          )
        })}

        {sending && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <BotAvatar />
            <div
              style={{
                background: P.surface,
                border: `1px solid ${P.line}`,
                padding: '10px 14px',
                borderRadius: '14px 14px 14px 4px',
                fontSize: 14,
                color: P.inkMute,
              }}
            >
              …
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Composer — matches design exactly: input + camera icon + send */}
      <div
        style={{
          padding: '10px 16px 24px',
          background: P.bg,
          borderTop: `1px solid ${P.line}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: P.surface,
            borderRadius: 24,
            padding: '6px 6px 6px 16px',
            border: `1px solid ${P.line}`,
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage(input)
              }
            }}
            placeholder="Попитай нещо…"
            style={{
              flex: 1,
              fontSize: 14,
              color: input ? P.ink : P.inkMute,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'var(--font-inter-tight), sans-serif',
            }}
          />
          {/* Send button */}
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || sending}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              background: input.trim() && !sending ? P.primary : P.line,
              border: 'none',
              display: 'grid',
              placeItems: 'center',
              transition: 'background 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 12V2M7 2L3 6M7 2L11 6"
                stroke={P.primaryInk}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
