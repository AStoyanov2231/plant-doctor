'use client'

import React, { useEffect, useReducer, useCallback } from 'react'
import type { Screen } from '../types/navigation'
import type { Scan } from '../types/domain'
import { HomeScreen } from '../components/screens/HomeScreen'
import { AnalyzingScreen } from '../components/screens/AnalyzingScreen'
import { DiagnosisScreen } from '../components/screens/DiagnosisScreen'
import { ChatScreen } from '../components/screens/ChatScreen'
import { HistoryScreen } from '../components/screens/HistoryScreen'
import { PlantDetailScreen } from '../components/screens/PlantDetailScreen'
import { RemindersScreen } from '../components/screens/RemindersScreen'
import { AddReminderScreen } from '../components/screens/AddReminderScreen'

type State = { stack: Screen[] }
type Action =
  | { type: 'PUSH'; screen: Screen }
  | { type: 'POP' }
  | { type: 'TAB'; tab: 'home' | 'history' | 'reminders' }
  | { type: 'UPDATE_SCAN'; scan: Scan }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'PUSH':
      return { stack: [...state.stack, action.screen] }
    case 'POP':
      return { stack: state.stack.length > 1 ? state.stack.slice(0, -1) : state.stack }
    case 'TAB': {
      const tabScreen: Screen = { name: action.tab === 'home' ? 'home' : action.tab === 'history' ? 'history' : 'reminders' }
      return { stack: [tabScreen] }
    }
    case 'UPDATE_SCAN': {
      return {
        stack: state.stack.map((s) => {
          if ((s.name === 'diagnosis' || s.name === 'plant-detail' || s.name === 'chat') && s.scan.id === action.scan.id) {
            return { ...s, scan: action.scan }
          }
          return s
        }),
      }
    }
    default:
      return state
  }
}

export default function Page() {
  const [state, dispatch] = useReducer(reducer, { stack: [{ name: 'home' }] })

  const current = state.stack[state.stack.length - 1]

  const nav = {
    push: useCallback((s: Screen) => dispatch({ type: 'PUSH', screen: s }), []),
    pop: useCallback(() => dispatch({ type: 'POP' }), []),
  }

  const onTabChange = useCallback((tab: 'home' | 'history' | 'reminders') => {
    dispatch({ type: 'TAB', tab })
  }, [])

  const onScanUpdate = useCallback((scan: Scan) => {
    dispatch({ type: 'UPDATE_SCAN', scan })
  }, [])

  // Initialize session on mount
  useEffect(() => {
    fetch('/api/session', { method: 'POST' }).catch(() => {})
  }, [])

  // Handle browser back button
  useEffect(() => {
    function onPopState() {
      if (state.stack.length > 1) dispatch({ type: 'POP' })
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [state.stack.length])

  switch (current.name) {
    case 'home':
      return <HomeScreen nav={nav} onTabChange={onTabChange} />

    case 'analyzing':
      return (
        <AnalyzingScreen
          file={current.file}
          previewUrl={current.previewUrl}
          nav={nav}
        />
      )

    case 'diagnosis':
      return (
        <DiagnosisScreen
          scan={current.scan}
          nav={nav}
          onScanUpdate={onScanUpdate}
        />
      )

    case 'chat':
      return <ChatScreen scan={current.scan} nav={nav} />

    case 'history':
      return <HistoryScreen nav={nav} onTabChange={onTabChange} />

    case 'plant-detail':
      return (
        <PlantDetailScreen
          scan={current.scan}
          nav={nav}
          onScanUpdate={onScanUpdate}
        />
      )

    case 'reminders':
      return <RemindersScreen nav={nav} onTabChange={onTabChange} />

    case 'new-reminder':
      return (
        <AddReminderScreen
          nav={nav}
          preselectedScanId={current.preselectedScanId}
        />
      )

    default:
      return <HomeScreen nav={nav} onTabChange={onTabChange} />
  }
}
