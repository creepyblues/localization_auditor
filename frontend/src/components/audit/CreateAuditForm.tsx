'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { INDUSTRIES, AUDIT_MODES, AUDIT_TYPES, SOURCE_LANGUAGES } from '@/types';
import type { Glossary, AuditMode, AuditType, ImageLabel, UploadedImageFile } from '@/types';

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
  const [uploadedImages, setUploadedImages] = useState<UploadedImageFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    audit_type: (initialValues?.audit_type as AuditType) || 'standalone',
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

  // Helper to add image file to state
  const addImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const preview = event.target?.result as string;
      setUploadedImages((prev) => {
        if (prev.length >= 3) return prev;
        return [...prev, {
          file,
          label: 'localized' as ImageLabel,  // Default to localized
          preview,
        }];
      });
    };
    reader.readAsDataURL(file);
  }, []);

  // Global paste handler for image_upload mode
  useEffect(() => {
    if (formData.audit_mode !== 'image_upload') return;

    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Don't intercept paste if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (uploadedImages.length >= 3) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            const filename = `screenshot_${Date.now()}.png`;
            const file = new File([blob], filename, { type: blob.type });
            addImageFile(file);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => document.removeEventListener('paste', handleGlobalPaste);
  }, [formData.audit_mode, uploadedImages.length, addImageFile]);

  // Image upload handlers
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 3 - uploadedImages.length;

    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      addImageFile(files[i]);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateImageLabel = (index: number, label: ImageLabel) => {
    setUploadedImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, label } : img))
    );
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let audit;

      if (formData.audit_mode === 'image_upload') {
        // Validate image requirements
        const hasOriginal = uploadedImages.some((img) => img.label === 'original');
        const hasLocalized = uploadedImages.some((img) => img.label === 'localized');

        if (uploadedImages.length === 0) {
          throw new Error('Please upload at least one image');
        }
        if (formData.audit_type === 'comparison' && (!hasOriginal || !hasLocalized)) {
          throw new Error('Comparison audits require at least one original and one localized image');
        }
        if (formData.audit_type === 'standalone' && !hasLocalized) {
          throw new Error('Standalone audits require at least one localized image');
        }

        // Use image upload API
        audit = await api.createAuditWithImages(
          uploadedImages.map((img) => ({ file: img.file, label: img.label })),
          {
            audit_type: formData.audit_type,
            source_language: formData.source_language,
            target_language: undefined,  // Will be detected from images
            industry: formData.industry,
            glossary_id: formData.glossary_id ? parseInt(formData.glossary_id) : undefined,
          }
        );
      } else {
        // URL-based audit
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

        audit = await api.createAudit(auditData);
      }

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

          {/* Analysis Mode Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Analysis Mode</label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {AUDIT_MODES.map((mode) => (
                <label
                  key={mode.value}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.audit_mode === mode.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="audit_mode"
                    value={mode.value}
                    checked={formData.audit_mode === mode.value}
                    onChange={() => setFormData({ ...formData, audit_mode: mode.value })}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium">{mode.label}</span>
                </label>
              ))}
            </div>
            <p className="text-sm text-gray-500">
              {AUDIT_MODES.find((m) => m.value === formData.audit_mode)?.description}
            </p>
          </div>

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

          {/* Source Language - for standalone audits or image_upload mode */}
          {(formData.audit_type === 'standalone' || formData.audit_mode === 'image_upload') && (
            <Select
              id="source_language"
              label="Source Language (translated FROM)"
              value={formData.source_language}
              onChange={(e) => setFormData({ ...formData, source_language: e.target.value })}
              options={SOURCE_LANGUAGES}
            />
          )}

          {/* URL inputs - hide for image_upload mode */}
          {formData.audit_mode !== 'image_upload' && (
            <>
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

              <Input
                id="audit_url"
                label={formData.audit_type === 'comparison' ? 'Localized Website URL' : 'Website URL to Audit'}
                type="url"
                placeholder="https://example.com/ko"
                value={formData.audit_url}
                onChange={(e) => setFormData({ ...formData, audit_url: e.target.value })}
                required
              />
            </>
          )}

          {/* Image Upload UI - only for image_upload mode */}
          {formData.audit_mode === 'image_upload' && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Upload Screenshot Images (1-3 images)
              </label>

              {/* Drop zone / file input */}
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                role="button"
                aria-label="Upload images or paste from clipboard"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadedImages.length >= 3}
                />
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-600">
                  {uploadedImages.length >= 3
                    ? 'Maximum 3 images reached'
                    : 'Click to upload, drag and drop, or paste (Ctrl+V)'}
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG up to 10MB each ({3 - uploadedImages.length} slots remaining)
                </p>
              </div>

              {/* Image previews with label selectors */}
              {uploadedImages.length > 0 && (
                <div className="space-y-3">
                  {uploadedImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <img
                        src={img.preview}
                        alt={`Upload ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded border"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {img.file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(img.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <select
                          value={img.label}
                          onChange={(e) => updateImageLabel(idx, e.target.value as ImageLabel)}
                          className="mt-2 text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="original">Original (source)</option>
                          <option value="localized">Localized (target)</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Validation hints */}
              <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                {formData.audit_type === 'comparison' ? (
                  <p>
                    <span className="font-medium">Comparison audit:</span> Upload at least 1 original
                    (source language) and 1 localized (target language) image.
                  </p>
                ) : (
                  <p>
                    <span className="font-medium">Standalone audit:</span> Upload at least 1 localized
                    (target language) image for back-translation assessment.
                  </p>
                )}
              </div>
            </div>
          )}

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
