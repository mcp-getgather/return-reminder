import type { DataTransformSchema } from './DataTransformSchema';

export type BrandConfig = {
  brand_id: string;
  brand_name: string;
  logo_url: string;
  is_mandatory: boolean;
  is_dpage?: boolean;
  dataTransform: DataTransformSchema;
};
