import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { router } from './routes';

import './styles.css';

// Initialize Sentry
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  enableLogs: true,
  integrations: [
    Sentry.consoleLoggingIntegration(),
    Sentry.replayIntegration(),
    Sentry.browserTracingIntegration(),
  ],
  debug: import.meta.env.MODE !== 'production',
  tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: import.meta.env.MODE === 'production' ? 0.01 : 0.1,
  replaysOnErrorSampleRate: 1.0,
  release: import.meta.env.VITE_APP_VERSION || '1.0.0',
  beforeSend(event) {
    // Filter out development noise
    if (import.meta.env.MODE !== 'production') {
      if (
        event.exception?.values?.[0]?.value?.includes('Failed to retrieve data')
      ) {
        console.log('Filtering out development API error');
        return null;
      }
    }
    return event;
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
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
  </StrictMode>
);
