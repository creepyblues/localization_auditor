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

export type AuditStatus = 'pending' | 'scraping' | 'analyzing' | 'completed' | 'failed';

export type AuditType = 'comparison' | 'standalone';

export type AuditMode = 'auto' | 'text' | 'screenshot' | 'combined';

export type AuditDimension =
  | 'CORRECTNESS'
  | 'CULTURAL_RELEVANCE'
  | 'INDUSTRY_EXPERTISE'
  | 'FLUENCY'
  | 'CONSISTENCY'
  | 'COMPLETENESS'
  | 'UI_UX'
  | 'SEO';

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
  audit_url: string;
  source_language: string | null;
  target_language: string | null;
  industry: string | null;
  audit_mode: AuditMode | null;
  actual_audit_mode: AuditMode | null;
  glossary_id: number | null;
  status: AuditStatus;
  error_message: string | null;
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
  audit_url: string;
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
