import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { router } from './routes';

import './styles.css';

type SentryConfig = {
  dsn: string;
  environment: string;
};

// Fetch Sentry configuration from server
async function fetchSentryConfig(): Promise<SentryConfig | null> {
  try {
    const response = await fetch('/internal/sentry/config');
    if (!response.ok) {
      console.warn('Failed to fetch Sentry config from server');
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn('Error fetching Sentry config:', error);
    return null;
  }
}

// Initialize Sentry with config from server
async function initializeSentry() {
  const sentryConfig = await fetchSentryConfig();

  // Initialize Sentry with either server config or fallback to env vars
  Sentry.init({
    dsn: sentryConfig?.dsn || import.meta.env.VITE_SENTRY_DSN,
    environment: sentryConfig?.environment || import.meta.env.MODE,
    enableLogs: true,
    integrations: [
      Sentry.consoleLoggingIntegration(),
      Sentry.replayIntegration(),
      Sentry.browserTracingIntegration(),
    ],
    debug: import.meta.env.MODE !== 'production',
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      // Filter out development noise
      if (import.meta.env.MODE !== 'production') {
        if (
          event.exception?.values?.[0]?.value?.includes(
            'Failed to retrieve data'
          )
        ) {
          console.log('Filtering out development API error');
          return null;
        }
      }
      return event;
    },
  });
}

// App component with loading state
function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeSentry().then(() => {
      setIsInitialized(true);
    });
  }, []);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <Sentry.ErrorBoundary
      fallback={({ error }) => (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-4">
              We've been notified about this error.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Reload page
            </button>
          </div>
        </div>
      )}
    >
      <RouterProvider router={router} />
    </Sentry.ErrorBoundary>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
