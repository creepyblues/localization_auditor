'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { INDUSTRIES, AUDIT_MODES, AUDIT_TYPES, SOURCE_LANGUAGES } from '@/types';
import type { Glossary, AuditMode, AuditType } from '@/types';

interface CreateAuditFormProps {
  initialValues?: {
    audit_type?: string;
    original_url?: string;
    audit_url?: string;
    source_language?: string;
    industry?: string;
    glossary_id?: string;
    audit_mode?: string;
  };
  isRerun?: boolean;
}

export function CreateAuditForm({ initialValues, isRerun }: CreateAuditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [glossaries, setGlossaries] = useState<Glossary[]>([]);

  const [formData, setFormData] = useState({
    audit_type: (initialValues?.audit_type as AuditType) || 'comparison',
    original_url: initialValues?.original_url || '',
    audit_url: initialValues?.audit_url || '',
    source_language: initialValues?.source_language || 'en',
    industry: initialValues?.industry || 'general',
    glossary_id: initialValues?.glossary_id || '',
    audit_mode: (initialValues?.audit_mode as AuditMode) || 'auto',
  });

  useEffect(() => {
    api.listGlossaries().then(({ glossaries }) => {
      setGlossaries(glossaries);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const auditData = {
        audit_type: formData.audit_type,
        audit_url: formData.audit_url,
        industry: formData.industry,
        glossary_id: formData.glossary_id ? parseInt(formData.glossary_id) : undefined,
        audit_mode: formData.audit_mode,
        // Include original_url only for comparison audits
        ...(formData.audit_type === 'comparison' && { original_url: formData.original_url }),
        // Include source_language for standalone audits
        ...(formData.audit_type === 'standalone' && { source_language: formData.source_language }),
      };

      const audit = await api.createAudit(auditData);
      router.push(`/audits/${audit.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create audit');
    } finally {
      setLoading(false);
    }
  };

  const filteredGlossaries = glossaries.filter(
    (g) => g.industry === formData.industry || formData.industry === 'general'
  );

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold text-gray-900">
          {isRerun ? 'Rerun Audit' : 'Create New Audit'}
        </h2>
        <p className="text-sm text-gray-500">
          {isRerun
            ? 'Run the same audit again with modified settings'
            : formData.audit_type === 'comparison'
              ? 'Compare original and localized websites side-by-side'
              : 'Assess back-translation quality of a localized website'}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Audit Type Toggle */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Audit Type</label>
            <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
              {AUDIT_TYPES.map((type) => (
                <label key={type.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="audit_type"
                    value={type.value}
                    checked={formData.audit_type === type.value}
                    onChange={() => setFormData({ ...formData, audit_type: type.value })}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-gray-900">{type.label}</span>
                </label>
              ))}
            </div>
            <p className="text-sm text-gray-500">
              {AUDIT_TYPES.find((t) => t.value === formData.audit_type)?.description}
            </p>
          </div>

          {/* Original URL - only for comparison audits */}
          {formData.audit_type === 'comparison' && (
            <Input
              id="original_url"
              label="Original Website URL"
              type="url"
              placeholder="https://example.com"
              value={formData.original_url}
              onChange={(e) => setFormData({ ...formData, original_url: e.target.value })}
              required
            />
          )}

          {/* Source Language - only for standalone audits */}
          {formData.audit_type === 'standalone' && (
            <Select
              id="source_language"
              label="Source Language (translated FROM)"
              value={formData.source_language}
              onChange={(e) => setFormData({ ...formData, source_language: e.target.value })}
              options={SOURCE_LANGUAGES}
            />
          )}

          <Input
            id="audit_url"
            label={formData.audit_type === 'comparison' ? 'Localized Website URL' : 'Website URL to Audit'}
            type="url"
            placeholder="https://example.com/ko"
            value={formData.audit_url}
            onChange={(e) => setFormData({ ...formData, audit_url: e.target.value })}
            required
          />

          <div className="grid md:grid-cols-2 gap-4">
            <Select
              id="industry"
              label="Industry"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value, glossary_id: '' })}
              options={INDUSTRIES}
            />

            <Select
              id="glossary"
              label="Glossary (Optional)"
              value={formData.glossary_id}
              onChange={(e) => setFormData({ ...formData, glossary_id: e.target.value })}
              options={[
                { value: '', label: 'No glossary' },
                ...filteredGlossaries.map((g) => ({
                  value: g.id.toString(),
                  label: `${g.name} (${g.source_language} → ${g.target_language})`,
                })),
              ]}
            />
          </div>

          <div className="space-y-2">
            <Select
              id="audit_mode"
              label="Analysis Mode"
              value={formData.audit_mode}
              onChange={(e) => setFormData({ ...formData, audit_mode: e.target.value as AuditMode })}
              options={AUDIT_MODES.map((mode) => ({
                value: mode.value,
                label: mode.label,
              }))}
            />
            <p className="text-sm text-gray-500">
              {AUDIT_MODES.find((m) => m.value === formData.audit_mode)?.description}
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">What will be analyzed:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Translation correctness and accuracy</li>
              <li>• Cultural relevance and adaptation</li>
              <li>• Industry-specific terminology</li>
              <li>• Content fluency and natural flow</li>
              {formData.audit_type === 'comparison' && (
                <li>• Consistency with original content</li>
              )}
              <li>• UI/UX localization (dates, currency, etc.)</li>
              <li>• SEO optimization for localized content</li>
            </ul>
            {formData.audit_type === 'standalone' && (
              <p className="text-xs text-blue-600 mt-2 italic">
                Note: Standalone audits assess back-translation quality without comparing to an original source.
              </p>
            )}
          </div>

          <Button type="submit" loading={loading} className="w-full">
            Start Audit
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
