import type { Scan } from './domain'

export type Screen =
  | { name: 'home' }
  | { name: 'analyzing'; file: File; previewUrl: string }
  | { name: 'diagnosis'; scan: Scan }
  | { name: 'chat'; scan: Scan }
  | { name: 'history' }
  | { name: 'plant-detail'; scan: Scan }
  | { name: 'reminders' }
  | { name: 'new-reminder'; preselectedScanId?: string }

export interface NavActions {
  push: (s: Screen) => void
  pop: () => void
}
