// API Response types
export type Prompt = {
  name: string;
  value?: string;
  type: string;
  prompt?: string;
  label?: string | null;
  variant?: 'secondary' | 'primary';
  dependsOnFields?: string;
  options?: string[] | null;
};

export type Choice = {
  name: string;
  groups: Prompt[];
  message: string | null;
};

export type Response = {
  choices?: Choice[];
  prompt?: {
    choices?: Choice[];
    prompt?: string;
  };
  profile_id?: string;
  platform?: string;
  state?: {
    finished?: boolean;
    step_index?: number;
    current_page_spec_name?: string;
    prompt?: {
      name?: string;
      prompt?: string;
      choices?: Choice[];
    };
    inputs?: Record<string, string>;
    error?: string | null;
    bundle?: unknown;
    brand_name?: string;
    [key: string]: unknown;
  };
  error?: string;
  status?: string;
  brand_name?: string;
  extract_result?: unknown;
  // Add other expected properties as needed
  [key: string]: unknown;
};
