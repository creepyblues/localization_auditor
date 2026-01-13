export interface User {
  id: number;
  email: string;
  name: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export type AuditStatus = 'pending' | 'scraping' | 'analyzing' | 'completed' | 'failed' | 'blocked';

export type AuditType = 'comparison' | 'standalone' | 'proficiency';

export type AuditMode = 'auto' | 'text' | 'screenshot' | 'combined' | 'image_upload';

export type ImageLabel = 'original' | 'localized';

export interface UploadedImageInfo {
  label: ImageLabel;
  filename: string;
  data?: string;  // Base64-encoded image data
}

export interface UploadedImageFile {
  file: File;
  label: ImageLabel;
  preview: string;  // Data URL for preview
}

export type AuditDimension =
  | 'CORRECTNESS'
  | 'CULTURAL_RELEVANCE'
  | 'INDUSTRY_EXPERTISE'
  | 'FLUENCY'
  | 'CONSISTENCY'
  | 'COMPLETENESS'
  | 'UI_UX'
  | 'SEO'
  | 'LANGUAGE_PROFICIENCY';

export interface AuditFinding {
  issue: string;
  original?: string;
  localized?: string;
  text?: string;  // Used in standalone audits instead of original/localized
  suggestion?: string;
  severity: 'high' | 'medium' | 'low';
}

export interface GoodExample {
  description: string;
  original?: string;
  localized?: string;
}

export interface AuditResult {
  id: number;
  dimension: AuditDimension;
  score: number;
  findings: AuditFinding[];
  good_examples?: GoodExample[];
  recommendations: string[];
}

export interface ContentPairItem {
  original?: string;
  localized?: string;
  level?: number;
  index?: number;
}

export interface ContentPairImage {
  original_alt?: string;
  localized_alt?: string;
  src?: string;
  index?: number;
}

export interface ContentPairs {
  title?: ContentPairItem;
  meta_description?: ContentPairItem;
  meta_keywords?: ContentPairItem;
  headings?: ContentPairItem[];
  paragraphs?: ContentPairItem[];
  buttons?: ContentPairItem[];
  links?: ContentPairItem[];
  images?: ContentPairImage[];
}

export interface AuditGlossaryTerm {
  source_term: string;
  target_term: string;
  context: string | null;
}

export interface AuditGlossary {
  id: number;
  name: string;
  description: string | null;
  industry: string;
  source_language: string;
  target_language: string;
  is_system: boolean;
  terms?: AuditGlossaryTerm[];
}

export interface Audit {
  id: number;
  audit_type: AuditType;
  original_url: string | null;  // null for standalone audits
  audit_url: string | null;  // null for image_upload mode
  source_language: string | null;
  target_language: string | null;
  industry: string | null;
  audit_mode: AuditMode | null;
  actual_audit_mode: AuditMode | null;
  glossary_id: number | null;
  status: AuditStatus;
  error_message: string | null;
  blocked_reason: string | null;
  progress_message: string | null;
  progress_step: number | null;
  progress_total: number | null;
  overall_score: number | null;
  created_at: string;
  completed_at: string | null;
  results?: AuditResult[];
  content_pairs?: ContentPairs;
  original_screenshot: string | null;
  audit_screenshot: string | null;
  uploaded_images?: UploadedImageInfo[] | null;  // For image_upload mode
  glossary?: AuditGlossary | null;
  // API usage and cost
  api_cost_usd: number | null;
  api_input_tokens: number | null;
  api_output_tokens: number | null;
  api_duration_ms: number | null;
}

export interface AuditCreate {
  audit_type?: AuditType;
  original_url?: string;  // Required for comparison, optional for standalone
  audit_url?: string;  // Optional for image_upload mode
  source_language?: string;  // Required for standalone
  target_language?: string;
  industry?: string;
  glossary_id?: number;
  audit_mode?: AuditMode;
}

export interface GlossaryTerm {
  id: number;
  source_term: string;
  target_term: string;
  context: string | null;
  notes: string | null;
  created_at: string;
}

export interface Glossary {
  id: number;
  name: string;
  description: string | null;
  industry: string;
  source_language: string;
  target_language: string;
  is_system: boolean;
  created_at: string;
  terms?: GlossaryTerm[];
}

export interface GlossaryCreate {
  name: string;
  description?: string;
  industry: string;
  source_language: string;
  target_language: string;
}

export interface GlossaryTermCreate {
  source_term: string;
  target_term: string;
  context?: string;
  notes?: string;
}

export interface CSVImportDetail {
  source_language: string;
  target_language: string;
  terms_added: number;
  terms_skipped: number;
}

export interface CSVImportResult {
  glossaries_created: number;
  glossaries_updated: number;
  terms_added: number;
  terms_skipped: number;
  errors: string[];
  details: CSVImportDetail[];
}

export const DIMENSION_LABELS: Record<AuditDimension, string> = {
  CORRECTNESS: 'Correctness',
  CULTURAL_RELEVANCE: 'Cultural Relevance',
  INDUSTRY_EXPERTISE: 'Industry Expertise',
  FLUENCY: 'Fluency',
  CONSISTENCY: 'Consistency',
  COMPLETENESS: 'Completeness',
  UI_UX: 'UI/UX Localization',
  SEO: 'SEO',
  LANGUAGE_PROFICIENCY: 'Language Proficiency',
};

export const DIMENSION_DESCRIPTIONS: Record<AuditDimension, string> = {
  CORRECTNESS: 'Translation accuracy, grammar, spelling',
  CULTURAL_RELEVANCE: 'Cultural adaptation, idioms, tone',
  INDUSTRY_EXPERTISE: 'Domain terminology, compliance',
  FLUENCY: 'Natural reading flow',
  CONSISTENCY: 'Uniform terminology usage',
  COMPLETENESS: 'Missing/untranslated content',
  UI_UX: 'Date, currency, measurement formats',
  SEO: 'Meta tags, keywords localization',
  LANGUAGE_PROFICIENCY: 'Native vs translated text quality',
};

export const INDUSTRIES = [
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'adtech', label: 'Ad Tech' },
  { value: 'wellness', label: 'Wellness & Health' },
  { value: 'fintech', label: 'FinTech' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'saas', label: 'SaaS' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'general', label: 'General' },
];

export const AUDIT_MODES: { value: AuditMode; label: string; description: string }[] = [
  { value: 'auto', label: 'Auto (Recommended)', description: 'Tries text scraping first, falls back to screenshot if blocked' },
  { value: 'text', label: 'Text Only', description: 'Extracts and analyzes page text content' },
  { value: 'screenshot', label: 'Screenshot Only', description: 'Visual analysis using page screenshots' },
  { value: 'combined', label: 'Combined (Most Thorough)', description: 'Both text and screenshot analysis, merged results' },
  { value: 'image_upload', label: 'Upload Images', description: 'Upload screenshot images instead of providing URLs' },
];

export const AUDIT_TYPES: { value: AuditType; label: string; description: string }[] = [
  { value: 'comparison', label: 'Comparison Audit', description: 'Compare original and localized URLs side-by-side' },
  { value: 'standalone', label: 'Standalone Audit', description: 'Assess back-translation quality of a single URL' },
];

export const SOURCE_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ko', label: 'Korean' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese (Simplified)' },
  { value: 'zh-TW', label: 'Chinese (Traditional/Taiwan)' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
];

// App Store Scanner Types
export interface AppStoreApp {
  app_id: string;
  app_name: string;
  artist: string;
  bundle_id: string;
  languages: string[];
  language_count: number;
  price: number;
  currency: string;
  version: string;
  release_date: string;
  current_version_release_date: string;
  average_user_rating: number;
  user_rating_count: number;
  error?: string;
}

export interface AppStoreScanStatistics {
  total_unique_languages: number;
  all_languages_found: string[];
  apps_by_language_count: Record<string, number>;
  average_languages_per_app: number;
}

export interface AppStoreScanResult {
  category: string;
  feed_type: string;
  country_code: string;
  total_apps_scanned: number;
  apps: AppStoreApp[];
  statistics: AppStoreScanStatistics;
}

export interface AppStoreCategories {
  categories: Record<string, number>;
  feed_types: Record<string, string>;
}

export const APP_STORE_CATEGORIES = [
  { value: 'health_fitness', label: 'Health & Fitness' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'education', label: 'Education' },
  { value: 'games', label: 'Games' },
  { value: 'business', label: 'Business' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'social_networking', label: 'Social Networking' },
  { value: 'travel', label: 'Travel' },
  { value: 'utilities', label: 'Utilities' },
];

export const APP_STORE_FEED_TYPES = [
  { value: 'free', label: 'Top Free' },
  { value: 'paid', label: 'Top Paid' },
  { value: 'grossing', label: 'Top Grossing' },
];

// Proficiency Test Types
export interface ProficiencyFinding {
  issue: string;
  text?: string;
  suggestion?: string;
  severity: 'high' | 'medium' | 'low';
}

export interface ProficiencyGoodExample {
  description: string;
  text?: string;
}

export interface ProficiencyTestResult {
  id: number;
  status: AuditStatus;
  url?: string | null;
  score?: number | null;
  verdict?: string | null;  // Native/Near-Native/Competent/Developing/Needs Improvement
  findings?: ProficiencyFinding[] | null;
  good_examples?: ProficiencyGoodExample[] | null;
  recommendations?: string[] | null;
  created_at: string;
  completed_at?: string | null;
  error_message?: string | null;
}

export const PROFICIENCY_VERDICTS: Record<string, { label: string; color: string }> = {
  'Native/Expert': { label: 'Native/Expert', color: 'text-green-600' },
  'Near-Native': { label: 'Near-Native', color: 'text-green-500' },
  'Competent': { label: 'Competent', color: 'text-yellow-600' },
  'Developing': { label: 'Developing', color: 'text-orange-500' },
  'Needs Improvement': { label: 'Needs Improvement', color: 'text-red-500' },
};
