/// <reference types="vite/client" />

import type { ChessAPI } from '../../electron/preload'

declare global {
  interface Window {
    api: ChessAPI
  }
}

export {}
