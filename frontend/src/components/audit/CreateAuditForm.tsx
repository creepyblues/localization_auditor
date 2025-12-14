'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { INDUSTRIES } from '@/types';
import type { Glossary } from '@/types';

export function CreateAuditForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [glossaries, setGlossaries] = useState<Glossary[]>([]);

  const [formData, setFormData] = useState({
    original_url: '',
    audit_url: '',
    industry: 'general',
    glossary_id: '',
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
      const audit = await api.createAudit({
        original_url: formData.original_url,
        audit_url: formData.audit_url,
        industry: formData.industry,
        glossary_id: formData.glossary_id ? parseInt(formData.glossary_id) : undefined,
      });
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
        <h2 className="text-xl font-semibold text-gray-900">Create New Audit</h2>
        <p className="text-sm text-gray-500">
          Enter the URLs of the original and localized websites to audit
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <Input
            id="original_url"
            label="Original Website URL"
            type="url"
            placeholder="https://example.com"
            value={formData.original_url}
            onChange={(e) => setFormData({ ...formData, original_url: e.target.value })}
            required
          />

          <Input
            id="audit_url"
            label="Localized Website URL"
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

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">What will be analyzed:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Translation correctness and accuracy</li>
              <li>• Cultural relevance and adaptation</li>
              <li>• Industry-specific terminology</li>
              <li>• Content fluency and consistency</li>
              <li>• UI/UX localization (dates, currency, etc.)</li>
              <li>• SEO optimization for localized content</li>
            </ul>
          </div>

          <Button type="submit" loading={loading} className="w-full">
            Start Audit
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
