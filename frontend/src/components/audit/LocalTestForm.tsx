'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { SOURCE_LANGUAGES, ProficiencyTestResult, PROFICIENCY_VERDICTS } from '@/types';

interface LocalTestFormProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export function LocalTestForm({ onComplete, onCancel }: LocalTestFormProps) {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProficiencyTestResult | null>(null);
  const [polling, setPolling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
      setUrl(''); // Clear URL when image is selected
    }
  }, []);

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (e.target.value) {
      setImage(null);
      setImagePreview(null);
    }
  }, []);

  const clearImage = useCallback(() => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const pollForResult = useCallback(async (id: number) => {
    setPolling(true);
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const audit = await api.getAudit(id);

        if (audit.status === 'completed' || audit.status === 'failed') {
          // Handle failed status first
          if (audit.status === 'failed') {
            setError(audit.error_message || 'Test failed');
            setPolling(false);
            return;
          }

          // Convert audit to proficiency result format
          const profResult = audit.results?.find(r => r.dimension === 'LANGUAGE_PROFICIENCY');

          if (profResult) {
            // Handle null/undefined score gracefully
            const score = profResult.score ?? 0;

            // Determine verdict from score
            let verdict = 'Needs Improvement';
            if (score >= 90) verdict = 'Native/Expert';
            else if (score >= 75) verdict = 'Near-Native';
            else if (score >= 60) verdict = 'Competent';
            else if (score >= 40) verdict = 'Developing';

            setResult({
              id: audit.id,
              status: audit.status,
              url: audit.audit_url,
              score: score,
              verdict,
              findings: profResult.findings,
              good_examples: profResult.good_examples,
              recommendations: profResult.recommendations,
              created_at: audit.created_at,
              completed_at: audit.completed_at,
              error_message: audit.error_message,
            });
          } else {
            // Completed but no results - treat as error
            setError('Analysis completed but no results found. Please try again.');
          }
          setPolling(false);
          return;
        }

        // Still processing, wait and try again
        await new Promise(resolve => setTimeout(resolve, 3000));
        attempts++;
      } catch (err) {
        console.error('Polling error:', err);
        attempts++;
      }
    }

    setError('Test timed out');
    setPolling(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!url && !image) {
      setError('Please provide a URL or upload an image');
      return;
    }

    setLoading(true);

    try {
      const response = await api.runProficiencyTest({
        url: url || undefined,
        image: image || undefined,
        target_language: targetLanguage,
      });

      // Start polling for result
      pollForResult(response.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run test');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-green-500';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-blue-100 text-blue-700',
    };
    return colors[severity as keyof typeof colors] || colors.low;
  };

  // Show result view
  if (result) {
    // Calculate issue counts by severity
    const highCount = result.findings?.filter(f => f.severity === 'high').length || 0;
    const mediumCount = result.findings?.filter(f => f.severity === 'medium').length || 0;
    const lowCount = result.findings?.filter(f => f.severity === 'low').length || 0;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Language Proficiency Results</CardTitle>
          <CardDescription>
            Analysis of {result.url || 'uploaded image'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Score and Verdict */}
          <div className="text-center mb-6">
            <div className={`text-6xl font-bold ${getScoreColor(result.score || 0)}`}>
              {result.score}
            </div>
            <div className="text-xl text-gray-600 mt-2">
              {result.verdict && PROFICIENCY_VERDICTS[result.verdict] ? (
                <span className={PROFICIENCY_VERDICTS[result.verdict].color}>
                  {result.verdict}
                </span>
              ) : (
                <span>{result.verdict}</span>
              )}
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">How We Score</h3>
            <p className="text-sm text-gray-600 mb-3">
              This score measures how naturally the text reads to a native speaker, based on:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                <span>Lexical Sophistication</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                <span>Idiomatic Fluency</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                <span>Cultural Authenticity</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                <span>Register Consistency</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                <span>Structural Naturalness</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                <span>Collocational Accuracy</span>
              </div>
            </div>
            {(highCount > 0 || mediumCount > 0 || lowCount > 0) && (
              <div className="flex gap-4 text-xs pt-2 border-t border-gray-200">
                <span className="text-gray-500">Issues found:</span>
                {highCount > 0 && <span className="text-red-600">{highCount} high</span>}
                {mediumCount > 0 && <span className="text-yellow-600">{mediumCount} medium</span>}
                {lowCount > 0 && <span className="text-blue-600">{lowCount} low</span>}
              </div>
            )}
          </div>

          {/* Good Examples - Enhanced with text samples */}
          {result.good_examples && result.good_examples.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-green-700 mb-3">
                Strengths
                <span className="text-sm font-normal text-gray-500 ml-2">
                  (Examples of native-quality writing)
                </span>
              </h3>
              <div className="space-y-3">
                {result.good_examples.map((example, idx) => (
                  <div key={idx} className="border border-green-200 rounded-lg p-3 bg-green-50">
                    <div className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5 text-lg">&#10003;</span>
                      <div className="flex-1">
                        <p className="text-gray-700">{example.description}</p>
                        {example.text && (
                          <p className="text-sm text-green-700 mt-2 font-medium bg-green-100 p-2 rounded">
                            &ldquo;{example.text}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Findings - Enhanced with before/after comparison */}
          {result.findings && result.findings.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Texts Needing Attention
                <span className="text-sm font-normal text-gray-500 ml-2">
                  (Click to see suggested improvements)
                </span>
              </h3>
              <div className="space-y-4">
                {result.findings.map((finding, idx) => (
                  <div key={idx} className="border rounded-lg overflow-hidden">
                    <div className="p-3 bg-gray-50 border-b">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getSeverityBadge(finding.severity)}`}>
                          {finding.severity}
                        </span>
                        <p className="font-medium text-gray-900">{finding.issue}</p>
                      </div>
                    </div>
                    {(finding.text || finding.suggestion) && (
                      <div className="p-3 space-y-3">
                        {finding.text && (
                          <div>
                            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Current Text:</p>
                            <p className="text-sm bg-red-50 text-red-800 p-2 rounded border border-red-200">
                              &ldquo;{finding.text}&rdquo;
                            </p>
                          </div>
                        )}
                        {finding.suggestion && (
                          <div>
                            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Suggested Improvement:</p>
                            <p className="text-sm bg-green-50 text-green-800 p-2 rounded border border-green-200">
                              &ldquo;{finding.suggestion}&rdquo;
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">General Recommendations</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {result.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-8">
            <Button variant="secondary" onClick={() => router.push(`/audits/${result.id}`)}>
              View Full Details
            </Button>
            <Button variant="secondary" onClick={() => {
              setResult(null);
              setUrl('');
              setImage(null);
              setImagePreview(null);
            }}>
              Run Another Test
            </Button>
            {onComplete && (
              <Button onClick={onComplete}>
                Done
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Language Proficiency Test</CardTitle>
        <CardDescription>
          Quickly assess if text appears to be written by a native speaker or translated.
          Provide a URL or upload a screenshot.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website URL
            </label>
            <Input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={handleUrlChange}
              disabled={!!image || loading || polling}
            />
          </div>

          {/* Or divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">OR</span>
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload Screenshot
            </label>
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-48 rounded border"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                  disabled={loading || polling}
                >
                  &times;
                </button>
              </div>
            ) : (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={!!url || loading || polling}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            )}
          </div>

          {/* Language Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Language to Test
            </label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              disabled={loading || polling}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SOURCE_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Polling Status */}
          {polling && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
              <span>Analyzing content...</span>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3">
            {onCancel && (
              <Button type="button" variant="secondary" onClick={onCancel} disabled={loading || polling}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={loading || polling || (!url && !image)}>
              {loading ? 'Starting...' : polling ? 'Analyzing...' : 'Run Proficiency Test'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
