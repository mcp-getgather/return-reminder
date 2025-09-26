import * as Sentry from '@sentry/node';

type LogContext = {
  component?: string;
  operation?: string;
  brandId?: string;
  sessionId?: string;
  [key: string]: any;
};

export class Logger {
  static info(message: string, context?: LogContext) {
    console.log(
      `[INFO] ${message}`,
      context ? JSON.stringify(context, null, 2) : ''
    );
  }

  static warn(message: string, context?: LogContext) {
    console.warn(
      `[WARN] ${message}`,
      context ? JSON.stringify(context, null, 2) : ''
    );
  }

  static error(message: string, error?: Error, context?: LogContext) {
    console.error(
      `[ERROR] ${message}`,
      error?.message || '',
      context ? JSON.stringify(context, null, 2) : ''
    );

    // Send to Sentry with context
    if (error) {
      Sentry.captureException(error, {
        tags: {
          component: context?.component,
          operation: context?.operation,
          brand_id: context?.brandId,
        },
        extra: {
          ...context,
          originalMessage: message,
        },
      });
    } else {
      Sentry.captureMessage(message, 'error');
    }
  }

  static debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(
        `[DEBUG] ${message}`,
        context ? JSON.stringify(context, null, 2) : ''
      );
    }
  }
}
