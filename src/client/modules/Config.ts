import type { DataTransformSchema } from './DataTransformSchema';
import type { Schema } from './Schema';

export type BrandConfig = {
  brand_id: string;
  brand_name: string;
  logo_url: string;
  is_mandatory: boolean;
  schema: Array<Schema>;
  dataTransform: DataTransformSchema;
};
