// This file should be imported before any other modules
import * as Sentry from '@sentry/node';
import { settings } from './config.js';

// Initialize Sentry before any other imports
Sentry.init({
  dsn: settings.SENTRY_DSN,
  integrations: [
    Sentry.httpIntegration({
      ignoreIncomingRequests: (url) => {
        return (
          url.includes('/health') ||
          url.includes('/_next') ||
          url.includes('/assets')
        );
      },
    }),
    Sentry.expressIntegration(),
  ],
  tracesSampleRate: settings.NODE_ENV === 'production' ? 0.05 : 0.1,
  environment: settings.NODE_ENV,
  debug: false,
  beforeSend(event) {
    if (settings.NODE_ENV !== 'production') {
      if (
        event.exception?.values?.[0]?.value?.includes('ECONNREFUSED') ||
        event.exception?.values?.[0]?.value?.includes('fetch failed')
      ) {
        return null;
      }
    }
    return event;
  },
  beforeSendTransaction(event) {
    const ignoredPaths = ['/health', '/assets', '/_next', '/favicon'];
    if (ignoredPaths.some((path) => event.transaction?.includes(path))) {
      return null;
    }
    return event;
  },
});
