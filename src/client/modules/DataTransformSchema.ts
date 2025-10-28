export type PurchaseHistory = {
  brand: string;
  order_date?: Date;
  order_total: string;
  order_id: string;
  product_names: string[];
  image_urls: string[];
  max_return_dates: Date[];
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export type DataFieldMapping = {
  /** The key name in the output object */
  outputKey: string;
  /** JSONPath-like string to extract value from source data */
  sourcePath: string;
  /** Optional transformation function name */
  transform?: 'currency' | 'date' | 'image' | 'string' | 'array';
  /** Default value if source path is not found or is undefined */
  defaultValue?: string;
  /** Format template for currency transform */
  formatTemplate?: string;
  /** Regex pattern for extract transform - first capture group will be extracted */
  extractPattern?: string;
};

export type DataTransformSchema = {
  /** JSONPath to the array of items to transform */
  dataPath: string;
  /** Field mappings for transformation */
  fieldMappings: DataFieldMapping[];
};

/**
 * Get nested property value using dot notation path with numeric array indexing
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    if (current === null || current === undefined) {
      return undefined;
    }

    // Check if key is numeric and current is an array
    const numericIndex = parseInt(key, 10);
    if (!isNaN(numericIndex) && Array.isArray(current)) {
      return current[numericIndex];
    }

    if (isNaN(numericIndex) && Array.isArray(current)) {
      return current.map((item) => item[key]);
    }

    // Get the property value
    let value = current[key];

    // Auto-parse JSON strings when they look like JSON
    if (
      typeof value === 'string' &&
      (value.startsWith('{') || value.startsWith('['))
    ) {
      try {
        value = JSON.parse(value);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        // If parsing fails, return the string as-is
      }
    }

    return value !== undefined ? value : undefined;
  }, obj);
}

function parseReturnDate(returnDateStr: string) {
  // Match patterns like "closed on July 1, 2025" or "Eligible through July 12, 2025"
  const closedMatch = returnDateStr.match(/closed on (\w+ \d+, \d+)/i);
  if (closedMatch) {
    return new Date(closedMatch[1]);
  }

  const eligibleMatch = returnDateStr.match(
    /eligible (?:through|until) (\w+ \d+, \d+)/i
  );
  if (eligibleMatch) {
    return new Date(eligibleMatch[1]);
  }

  return null;
}

/**
 * Apply transformation based on transform type
 */
function applyTransform(
  value: any,
  mapping: DataFieldMapping
): string | string[] | Date | null {
  if (value === undefined || value === null) {
    return mapping.defaultValue || '';
  }

  // Preprocessing: Apply extractPattern if provided
  let processedValue = value;
  if (mapping.extractPattern && typeof value === 'string') {
    const match = value.match(new RegExp(mapping.extractPattern));
    if (match && match[1]) {
      processedValue = match[1];
    }
  }

  switch (mapping.transform) {
    case 'currency':
      if (
        typeof processedValue === 'object' &&
        processedValue.currency &&
        processedValue.amount
      ) {
        const template = mapping.formatTemplate || '{symbol}{amount}';
        return template
          .replace('{symbol}', processedValue.currency.symbol || '$')
          .replace('{amount}', processedValue.amount || '0.00');
      }
      return String(processedValue);

    case 'string':
      if (mapping.formatTemplate) {
        if (mapping.formatTemplate.includes('{value}')) {
          return mapping.formatTemplate.replace(
            '{value}',
            String(processedValue)
          );
        }
        if (mapping.formatTemplate.includes('${value}')) {
          return mapping.formatTemplate.replace(
            '${value}',
            String(processedValue)
          );
        }
      }
      return String(processedValue);

    case 'image':
      // Handle array of images
      if (Array.isArray(processedValue)) {
        return processedValue
          .filter((img) => img && typeof img === 'string')
          .map(String);
      }
      return String(processedValue);

    case 'date':
      if (Array.isArray(processedValue)) {
        return processedValue.map((v) => {
          if (typeof v === 'string') {
            return parseReturnDate(v);
          }
          return v;
        });
      }
      if (!processedValue) {
        return null;
      }

      if (typeof processedValue === 'object' && processedValue.displayDate) {
        return String(processedValue.displayDate);
      }
      return new Date(processedValue);
    case 'array':
      if (Array.isArray(processedValue)) {
        return processedValue.map(String);
      }
      return [String(processedValue)];
    default:
      if (Array.isArray(processedValue)) {
        return processedValue.map(String);
      }
      return String(processedValue);
  }
}

/**
 * Transform raw data using schema configuration
 */
export function transformData(
  rawData: any,
  schema: DataTransformSchema
): { [key: string]: string | string[] | Date | Date[] | null }[] {
  try {
    // Determine where the data array is located.
    let dataArray: unknown;

    if (schema.dataPath && schema.dataPath.trim() !== '') {
      dataArray = getNestedValue(rawData, schema.dataPath);
    }

    // Fallback: if dataPath is empty or did not resolve, but the rawData itself is an array, use it.
    if (!Array.isArray(dataArray) && Array.isArray(rawData)) {
      dataArray = rawData;
    }

    if (!Array.isArray(dataArray)) {
      console.warn('Data path does not resolve to an array:', schema.dataPath);
      return [];
    }

    // Transform each item according to field mappings
    return dataArray.map((item: any) => {
      const transformedItem: {
        [key: string]: string | string[] | Date | Date[] | null;
      } = {};
      schema.fieldMappings.forEach((mapping) => {
        const rawValue = getNestedValue(item, mapping.sourcePath);
        transformedItem[mapping.outputKey] = applyTransform(rawValue, mapping);
      });

      return transformedItem;
    });
  } catch (error) {
    console.error('Error transforming data:', error);
    return [];
  }
}
