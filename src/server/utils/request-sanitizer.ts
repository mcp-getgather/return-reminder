/**
 * Removes or masks sensitive information from request data for logging purposes
 */
interface SanitizationOptions {
  maskEmailDomains?: boolean;
  redactFields?: string[];
  maskFields?: string[];
}

const defaultOptions: SanitizationOptions = {
  maskEmailDomains: true,
  redactFields: ['password', 'token', 'key', 'secret'],
  maskFields: ['email', 'phone'],
};

/**
 * Mask email addresses to show only first 2 characters before @
 */
function maskEmail(email: string): string {
  const emailRegex = /^(.{0,2})[^@]*(@.*)$/;
  return email.replace(emailRegex, '$1***$2');
}

/**
 * Check if a key contains sensitive information
 */
function isSensitiveField(key: string, options: SanitizationOptions): boolean {
  const lowerKey = key.toLowerCase();
  
  // Check for redact fields (completely hidden)
  if (options.redactFields?.some(field => lowerKey.includes(field))) {
    return true;
  }
  
  // Check for mask fields (partially hidden)
  if (options.maskFields?.some(field => lowerKey.includes(field))) {
    return true;
  }
  
  return false;
}

/**
 * Recursively sanitize an object by redacting/masking sensitive fields
 */
function sanitizeObject(
  obj: any,
  options: SanitizationOptions = defaultOptions
): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      
      if (isSensitiveField(key, options)) {
        const lowerKey = key.toLowerCase();
        
        // Completely redact sensitive fields
        if (options.redactFields?.some(field => lowerKey.includes(field))) {
          sanitized[key] = '[REDACTED]';
        }
        // Mask fields like email
        else if (
          options.maskFields?.some(field => lowerKey.includes(field)) &&
          typeof value === 'string'
        ) {
          if (lowerKey.includes('email') && value.includes('@')) {
            sanitized[key] = maskEmail(value);
          } else {
            sanitized[key] = `${value.substring(0, 2)}***`;
          }
        } else {
          sanitized[key] = '[REDACTED]';
        }
      } else {
        sanitized[key] = sanitizeObject(value, options);
      }
    });
    
    return sanitized;
  }

  return obj;
}

/**
 * Create a sanitized log message with request data
 */
export function createSanitizedLogMessage(
  message: string,
  data?: any,
  options?: SanitizationOptions
): string {
  if (!data) {
    return message;
  }

  const sanitizedData = sanitizeObject(data, { ...defaultOptions, ...options });
  return `${message} | Data: ${JSON.stringify(sanitizedData)}`;
}

/**
 * Sanitize request data for logging
 */
export function sanitizeForLogging(
  data: any,
  options?: SanitizationOptions
): any {
  return sanitizeObject(data, { ...defaultOptions, ...options });
}