import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import * as Sentry from "@sentry/react"
import {BrowserRouter} from 'react-router'

import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'

import {ClerkProvider} from '@clerk/react'
import { SentryUserSync } from './components/SentryUserSync.jsx'
import { SentryErrorFallback } from './components/SentryErrorFallback.jsx'

const queryClient = new QueryClient()

const apibase = import.meta.env.VITE_API_URL ?? ""

const tracePropagationTargets = 
    apibase.length > 0 ? [apibase] : typeof window !== "undefined" ? [window.location.
    origin]: []


Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  sendDefaultPii: true,
  integrations:[
    Sentry.browserTracingIntegration(),
    // todo explain this in detail
    Sentry.replayIntegration({
      maskAllText: false,
      maskAllInputs: false,
      blockAllMedia: false
    })
  ],
  tracesSampleRate: 1.0,
  tracePropagationTargets,
  replaysSessionSampleRate: 1.0,
  replaysOnErrorSampleRate: 1.0,
  enableLogs: true
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ClerkProvider>
          <SentryUserSync />
          <Sentry.ErrorBoundary fallback={<SentryErrorFallback />}>
            <App />
          </Sentry.ErrorBoundary>
        </ClerkProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
