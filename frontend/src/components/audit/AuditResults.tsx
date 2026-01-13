'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { ImageZoomModal } from '@/components/ui/ImageZoomModal';
import { ContentComparisonTable } from './ContentComparisonTable';
import type { Audit, AuditResult, AuditDimension, AuditFinding, GoodExample, AuditGlossary } from '@/types';
import { DIMENSION_LABELS, DIMENSION_DESCRIPTIONS } from '@/types';

interface AuditResultsProps {
  audit: Audit;
}

// Clickable screenshot component
interface ClickableScreenshotProps {
  src: string;
  alt: string;
  className?: string;
  onOpen: (src: string) => void;
}

function ClickableScreenshot({ src, alt, className = '', onOpen }: ClickableScreenshotProps) {
  return (
    <div className="relative group">
      <img
        src={src}
        alt={alt}
        className={`${className} cursor-pointer transition-opacity group-hover:opacity-90`}
        onClick={() => onOpen(src)}
      />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-black/60 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
          Click to zoom
        </div>
      </div>
    </div>
  );
}

function GlossarySection({ glossary }: { glossary: AuditGlossary }) {
  const [showTerms, setShowTerms] = useState(false);
  const termCount = glossary.terms?.length || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Glossary Used
            </h3>
            <p className="text-sm text-gray-500">
              Terminology reference applied during analysis
            </p>
          </div>
          {glossary.is_system && (
            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
              System Glossary
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Glossary Info */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-purple-900">{glossary.name}</h4>
                {glossary.description && (
                  <p className="text-sm text-purple-700 mt-1">{glossary.description}</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              <span className="text-purple-700">
                <span className="font-medium">Languages:</span> {glossary.source_language.toUpperCase()} → {glossary.target_language.toUpperCase()}
              </span>
              <span className="text-purple-700">
                <span className="font-medium">Industry:</span> {glossary.industry}
              </span>
              <span className="text-purple-700">
                <span className="font-medium">Terms:</span> {termCount}
              </span>
            </div>
          </div>

          {/* Terms Toggle */}
          {termCount > 0 && (
            <div>
              <button
                onClick={() => setShowTerms(!showTerms)}
                className="flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-800"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showTerms ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {showTerms ? 'Hide' : 'Show'} {termCount} glossary terms
              </button>

              {showTerms && glossary.terms && (
                <div className="mt-3 border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Source Term</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Target Term</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Context</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {glossary.terms.map((term, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-mono text-gray-900">{term.source_term}</td>
                          <td className="px-4 py-2 font-mono text-purple-700">{term.target_term}</td>
                          <td className="px-4 py-2 text-gray-500">{term.context || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface IssueCardProps {
  finding: AuditFinding;
  auditType: 'comparison' | 'standalone' | 'proficiency';
  contentPairs?: import('@/types').ContentPairs;
}

// Helper to highlight text within context
function HighlightedText({ fullText, highlightText, className }: {
  fullText: string;
  highlightText: string;
  className?: string;
}) {
  if (!highlightText || !fullText.includes(highlightText)) {
    return <span className={className}>{fullText}</span>;
  }

  const parts = fullText.split(highlightText);
  return (
    <span className={className}>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <mark className="bg-red-200 text-red-900 px-0.5 rounded line-through decoration-red-500">
              {highlightText}
            </mark>
          )}
        </span>
      ))}
    </span>
  );
}

// Helper to find full context from content pairs
function findContextForText(
  searchText: string | undefined,
  contentPairs?: import('@/types').ContentPairs
): string | null {
  if (!searchText || !contentPairs) return null;

  const searchLower = searchText.toLowerCase();

  // Search in title
  if (contentPairs.title?.localized?.toLowerCase().includes(searchLower)) {
    return contentPairs.title.localized;
  }

  // Search in meta description
  if (contentPairs.meta_description?.localized?.toLowerCase().includes(searchLower)) {
    return contentPairs.meta_description.localized;
  }

  // Search in headings
  if (contentPairs.headings) {
    for (const heading of contentPairs.headings) {
      if (heading.localized?.toLowerCase().includes(searchLower)) {
        return heading.localized;
      }
    }
  }

  // Search in paragraphs
  if (contentPairs.paragraphs) {
    for (const para of contentPairs.paragraphs) {
      if (para.localized?.toLowerCase().includes(searchLower)) {
        return para.localized;
      }
    }
  }

  // Search in buttons
  if (contentPairs.buttons) {
    for (const btn of contentPairs.buttons) {
      if (btn.localized?.toLowerCase().includes(searchLower)) {
        return btn.localized;
      }
    }
  }

  // Search in links
  if (contentPairs.links) {
    for (const link of contentPairs.links) {
      if (link.localized?.toLowerCase().includes(searchLower)) {
        return link.localized;
      }
    }
  }

  return null;
}

function IssueCard({ finding, auditType, contentPairs }: IssueCardProps) {
  const severityStyles = {
    high: {
      card: 'border-l-4 border-l-red-500 bg-red-50 border border-red-200',
      badge: 'bg-red-100 text-red-700',
    },
    medium: {
      card: 'border-l-4 border-l-yellow-500 bg-yellow-50 border border-yellow-200',
      badge: 'bg-yellow-100 text-yellow-700',
    },
    low: {
      card: 'border-l-4 border-l-orange-500 bg-orange-50 border border-orange-200',
      badge: 'bg-orange-100 text-orange-700',
    },
  };

  const styles = severityStyles[finding.severity];

  // Determine current text based on audit type
  const currentText = auditType === 'standalone'
    ? (finding as AuditFinding & { text?: string }).text || finding.localized
    : (finding.localized || finding.original);

  // Try to find full context for the current text
  const fullContext = findContextForText(currentText, contentPairs);
  const hasContext = fullContext && fullContext !== currentText && fullContext.length > (currentText?.length || 0);

  return (
    <div className={`rounded-lg p-4 ${styles.card}`}>
      {/* Header: Issue description + severity badge */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <h5 className="font-medium text-gray-900">{finding.issue}</h5>
        <span className={`text-xs px-2 py-1 rounded-full shrink-0 uppercase font-semibold ${styles.badge}`}>
          {finding.severity}
        </span>
      </div>

      {/* Before/After Content */}
      <div className="space-y-3">
        {/* Current Text with Context */}
        {currentText && (
          <div className="bg-white border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">
                {hasContext ? 'Issue in Context' : 'Current Text'}
              </span>
            </div>
            {hasContext ? (
              <p className="font-mono text-sm text-gray-700 leading-relaxed">
                "<HighlightedText fullText={fullContext} highlightText={currentText} />"
              </p>
            ) : (
              <p className="font-mono text-sm text-gray-800">
                "<mark className="bg-red-200 text-red-900 px-0.5 rounded line-through decoration-red-500">{currentText}</mark>"
              </p>
            )}
          </div>
        )}

        {/* Suggested Fix */}
        {finding.suggestion && (
          <div className="bg-white border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                Suggested Fix
              </span>
            </div>
            <p className="font-mono text-sm text-green-800">
              "<mark className="bg-green-200 text-green-900 px-0.5 rounded font-medium">{finding.suggestion}</mark>"
            </p>
          </div>
        )}

        {/* Original Source Context (comparison audits only) */}
        {auditType === 'comparison' && finding.original && finding.localized && finding.original !== finding.localized && (
          <div className="bg-gray-100 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Original Source
              </span>
            </div>
            <p className="font-mono text-sm text-gray-600 italic">
              "{finding.original}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function GoodExampleCard({ example }: { example: GoodExample }) {
  return (
    <div className="p-3 rounded-lg border bg-green-50 border-green-200">
      <p className="text-sm font-medium text-green-800">{example.description}</p>

      <div className="mt-2 text-xs space-y-1 font-mono bg-white/70 p-2 rounded border border-green-100">
        {example.original && (
          <div className="flex gap-2">
            <span className="text-gray-500 shrink-0 w-16">original:</span>
            <span className="text-gray-800">"{example.original}"</span>
          </div>
        )}
        {example.localized && (
          <div className="flex gap-2">
            <span className="text-gray-500 shrink-0 w-16">localized:</span>
            <span className="text-green-700">"{example.localized}"</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface TabButtonProps {
  result: AuditResult;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ result, isActive, onClick }: TabButtonProps) {
  const score = result.score;
  const issueCount = result.findings?.length || 0;
  const label = DIMENSION_LABELS[result.dimension as AuditDimension];

  // Score color indicator
  const scoreColor = score >= 80
    ? 'bg-green-500'
    : score >= 60
    ? 'bg-yellow-500'
    : score >= 40
    ? 'bg-orange-500'
    : 'bg-red-500';

  // Badge colors based on score
  const badgeColors = score >= 80
    ? 'bg-green-100 text-green-700'
    : score >= 60
    ? 'bg-yellow-100 text-yellow-700'
    : score >= 40
    ? 'bg-orange-100 text-orange-700'
    : 'bg-red-100 text-red-700';

  const baseClasses = 'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors';
  const activeClasses = isActive
    ? 'bg-white border-b-2 border-blue-600 text-blue-600'
    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50';

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${activeClasses}`}
      role="tab"
      aria-selected={isActive}
    >
      {/* Score indicator dot */}
      <span className={`w-2 h-2 rounded-full ${scoreColor}`} />

      {/* Label */}
      <span>{label}</span>

      {/* Issue count badge (only if > 0) */}
      {issueCount > 0 && (
        <span className={`px-1.5 py-0.5 text-xs rounded-full ${badgeColors}`}>
          {issueCount}
        </span>
      )}
    </button>
  );
}

interface DimensionCardProps {
  result: AuditResult;
  originalScreenshot?: string | null;
  auditScreenshot?: string | null;
  auditType?: 'comparison' | 'standalone';
  contentPairs?: import('@/types').ContentPairs;
  onOpenZoom?: (src: string) => void;
}

function DimensionCard({ result, originalScreenshot, auditScreenshot, auditType, contentPairs, onOpenZoom }: DimensionCardProps) {
  const [showScreenshot, setShowScreenshot] = useState(false);
  const hasScreenshots = originalScreenshot || auditScreenshot;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">
            {DIMENSION_LABELS[result.dimension as AuditDimension]}
          </h3>
          <p className="text-sm text-gray-500">
            {DIMENSION_DESCRIPTIONS[result.dimension as AuditDimension]}
          </p>
        </div>
        <ScoreRing score={result.score} size="sm" showLabel={false} />
      </CardHeader>
      <CardContent>
        {/* Issues Section */}
        {result.findings && result.findings.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Issues ({result.findings.length})
            </h4>
            <div className="space-y-2">
              {result.findings.map((finding, idx) => (
                <IssueCard key={idx} finding={finding} auditType={auditType || 'comparison'} contentPairs={contentPairs} />
              ))}
            </div>
          </div>
        )}

        {/* Good Examples Section */}
        {result.good_examples && result.good_examples.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Good Examples ({result.good_examples.length})
            </h4>
            <div className="space-y-2">
              {result.good_examples.map((example, idx) => (
                <GoodExampleCard key={idx} example={example} />
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {result.recommendations && result.recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
            <ul className="list-disc list-inside space-y-1">
              {result.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-gray-600">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(!result.findings || result.findings.length === 0) &&
          (!result.good_examples || result.good_examples.length === 0) &&
          (!result.recommendations || result.recommendations.length === 0) && (
            <p className="text-sm text-gray-500 italic">No issues found in this dimension.</p>
          )}

        {/* Screenshot Reference */}
        {hasScreenshots && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowScreenshot(!showScreenshot)}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showScreenshot ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {showScreenshot ? 'Hide' : 'View'} Screenshot Reference
            </button>

            {showScreenshot && (
              <div className="mt-3">
                {auditType === 'standalone' ? (
                  // Standalone: show only audit screenshot
                  auditScreenshot && (
                    <div className="border rounded-lg overflow-hidden bg-gray-100">
                      <ClickableScreenshot
                        src={`data:image/png;base64,${auditScreenshot}`}
                        alt="Page screenshot"
                        className="w-full h-auto max-h-64 object-contain"
                        onOpen={onOpenZoom || (() => {})}
                      />
                    </div>
                  )
                ) : (
                  // Comparison: show both side by side
                  <div className="grid grid-cols-2 gap-2">
                    {originalScreenshot && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Original</p>
                        <div className="border rounded-lg overflow-hidden bg-gray-100">
                          <ClickableScreenshot
                            src={`data:image/png;base64,${originalScreenshot}`}
                            alt="Original page"
                            className="w-full h-auto max-h-48 object-contain"
                            onOpen={onOpenZoom || (() => {})}
                          />
                        </div>
                      </div>
                    )}
                    {auditScreenshot && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Localized</p>
                        <div className="border rounded-lg overflow-hidden bg-gray-100">
                          <ClickableScreenshot
                            src={`data:image/png;base64,${auditScreenshot}`}
                            alt="Localized page"
                            className="w-full h-auto max-h-48 object-contain"
                            onOpen={onOpenZoom || (() => {})}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface DimensionTabContentProps {
  result: AuditResult;
  originalScreenshot?: string | null;
  auditScreenshot?: string | null;
  auditType: 'comparison' | 'standalone' | 'proficiency';
  contentPairs?: import('@/types').ContentPairs;
  onOpenZoom?: (src: string) => void;
}

function DimensionTabContent({ result, originalScreenshot, auditScreenshot, auditType, contentPairs, onOpenZoom }: DimensionTabContentProps) {
  const [showScreenshot, setShowScreenshot] = useState(false);
  const hasScreenshots = originalScreenshot || auditScreenshot;

  return (
    <div className="space-y-6">
      {/* Dimension Header */}
      <div className="flex items-start justify-between pb-4 border-b border-gray-200">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            {DIMENSION_LABELS[result.dimension as AuditDimension]}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {DIMENSION_DESCRIPTIONS[result.dimension as AuditDimension]}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-gray-900">{result.score}</span>
          <ScoreRing score={result.score} size="sm" showLabel={false} />
        </div>
      </div>

      {/* Issues Section */}
      {result.findings && result.findings.length > 0 && (
        <div>
          <h4 className="text-base font-medium text-red-700 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Issues Found ({result.findings.length})
          </h4>
          <div className="space-y-4">
            {result.findings.map((finding, idx) => (
              <IssueCard key={idx} finding={finding} auditType={auditType} contentPairs={contentPairs} />
            ))}
          </div>
        </div>
      )}

      {/* Good Examples Section */}
      {result.good_examples && result.good_examples.length > 0 && (
        <div>
          <h4 className="text-base font-medium text-green-700 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Good Examples ({result.good_examples.length})
          </h4>
          <div className="space-y-3">
            {result.good_examples.map((example, idx) => (
              <GoodExampleCard key={idx} example={example} />
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations && result.recommendations.length > 0 && (
        <div>
          <h4 className="text-base font-medium text-gray-700 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Recommendations
          </h4>
          <ul className="space-y-2">
            {result.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-blue-500 mt-1">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* No issues message */}
      {(!result.findings || result.findings.length === 0) &&
        (!result.good_examples || result.good_examples.length === 0) &&
        (!result.recommendations || result.recommendations.length === 0) && (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500">No issues found in this dimension. Great job!</p>
          </div>
        )}

      {/* Screenshot Reference */}
      {hasScreenshots && (
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={() => setShowScreenshot(!showScreenshot)}
            className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showScreenshot ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {showScreenshot ? 'Hide' : 'View'} Screenshot Reference
          </button>

          {showScreenshot && (
            <div className="mt-3">
              {auditType === 'standalone' ? (
                auditScreenshot && (
                  <div className="border rounded-lg overflow-hidden bg-gray-100">
                    <ClickableScreenshot
                      src={`data:image/png;base64,${auditScreenshot}`}
                      alt="Page screenshot"
                      className="w-full h-auto max-h-96 object-contain"
                      onOpen={onOpenZoom || (() => {})}
                    />
                  </div>
                )
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {originalScreenshot && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1 font-medium">Original</p>
                      <div className="border rounded-lg overflow-hidden bg-gray-100">
                        <ClickableScreenshot
                          src={`data:image/png;base64,${originalScreenshot}`}
                          alt="Original page"
                          className="w-full h-auto max-h-64 object-contain"
                          onOpen={onOpenZoom || (() => {})}
                        />
                      </div>
                    </div>
                  )}
                  {auditScreenshot && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1 font-medium">Localized</p>
                      <div className="border rounded-lg overflow-hidden bg-gray-100">
                        <ClickableScreenshot
                          src={`data:image/png;base64,${auditScreenshot}`}
                          alt="Localized page"
                          className="w-full h-auto max-h-64 object-contain"
                          onOpen={onOpenZoom || (() => {})}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AuditResults({ audit }: AuditResultsProps) {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [zoomModalOpen, setZoomModalOpen] = useState(false);
  const [zoomImageSrc, setZoomImageSrc] = useState('');

  const handleOpenZoom = (src: string) => {
    setZoomImageSrc(src);
    setZoomModalOpen(true);
  };

  // Sort results by score (lowest first to highlight issues)
  // For standalone audits, filter out CONSISTENCY dimension (not applicable)
  const filteredResults = audit.audit_type === 'standalone'
    ? (audit.results || []).filter((r) => r.dimension !== 'CONSISTENCY')
    : (audit.results || []);
  const sortedResults = [...filteredResults].sort((a, b) => a.score - b.score);

  // Initialize active tab to lowest-scoring dimension
  useEffect(() => {
    if (sortedResults.length > 0 && activeTab === null) {
      setActiveTab(sortedResults[0].dimension);
    }
  }, [sortedResults, activeTab]);

  // Get active result
  const activeResult = sortedResults.find((r) => r.dimension === activeTab) || sortedResults[0];

  if (!audit.results || audit.results.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          No results available yet.
        </CardContent>
      </Card>
    );
  }

  // Check if there's any right column content
  const hasRightColumnContent = audit.audit_type === 'standalone' ||
    audit.glossary ||
    audit.audit_screenshot ||
    audit.original_screenshot ||
    (audit.audit_mode === 'image_upload' && audit.uploaded_images && audit.uploaded_images.length > 0);

  return (
    <div className="space-y-6">
      {/* Two Column Layout: Scores (Left) | Other Content (Right) */}
      <div className={`grid gap-6 ${hasRightColumnContent ? 'lg:grid-cols-2' : ''}`}>
        {/* Left Column: Scores */}
        <div className="space-y-6">
          {/* Overall Score */}
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center gap-6">
                <ScoreRing score={audit.overall_score || 0} size="lg" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Overall Score</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Based on {sortedResults.length} dimensions
                  </p>
                  <div className="flex flex-wrap gap-3 mt-3 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      <span>80+</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span>60-79</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                      <span>40-59</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span>&lt;40</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Score Breakdown */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Score Breakdown</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sortedResults.map((result) => (
                  <div key={result.dimension} className="flex items-center gap-3">
                    <span className="w-32 text-sm text-gray-700 truncate">
                      {DIMENSION_LABELS[result.dimension as AuditDimension]}
                    </span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          result.score >= 80
                            ? 'bg-green-500'
                            : result.score >= 60
                            ? 'bg-yellow-500'
                            : result.score >= 40
                            ? 'bg-orange-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${result.score}%` }}
                      />
                    </div>
                    <span className="w-8 text-sm font-medium text-right">{result.score}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Other Info */}
        {hasRightColumnContent && (
          <div className="space-y-6">
            {/* Audit Type Indicator for Standalone */}
            {audit.audit_type === 'standalone' && (
              <Card className="border-purple-200 bg-purple-50">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-purple-900">Back-Translation Assessment</h4>
                      <p className="text-sm text-purple-700 mt-1">
                        Evaluating translation quality from {audit.source_language?.toUpperCase() || 'source'} without original comparison.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Glossary Used */}
            {audit.glossary && (
              <GlossarySection glossary={audit.glossary} />
            )}

            {/* Screenshot - Standalone */}
            {audit.audit_type === 'standalone' && audit.audit_screenshot && (
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-gray-900">Page Screenshot</h3>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden bg-gray-100">
                    <ClickableScreenshot
                      src={`data:image/png;base64,${audit.audit_screenshot}`}
                      alt="Audited page screenshot"
                      className="w-full h-auto max-h-80 object-contain"
                      onOpen={handleOpenZoom}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Screenshot Comparison - Comparison mode */}
            {audit.audit_type !== 'standalone' && (audit.original_screenshot || audit.audit_screenshot) && (
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-gray-900">Screenshots</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {audit.original_screenshot && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1 font-medium">Original</p>
                        <div className="border rounded-lg overflow-hidden bg-gray-100">
                          <ClickableScreenshot
                            src={`data:image/png;base64,${audit.original_screenshot}`}
                            alt="Original page"
                            className="w-full h-auto max-h-48 object-contain"
                            onOpen={handleOpenZoom}
                          />
                        </div>
                      </div>
                    )}
                    {audit.audit_screenshot && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1 font-medium">Localized</p>
                        <div className="border rounded-lg overflow-hidden bg-gray-100">
                          <ClickableScreenshot
                            src={`data:image/png;base64,${audit.audit_screenshot}`}
                            alt="Localized page"
                            className="w-full h-auto max-h-48 object-contain"
                            onOpen={handleOpenZoom}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Uploaded Images - Image Upload mode */}
            {audit.audit_mode === 'image_upload' && audit.uploaded_images && audit.uploaded_images.length > 0 && (
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-gray-900">Uploaded Images</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {audit.uploaded_images
                      .filter((img) => img.label === 'original')
                      .map((img, idx) => (
                        <div key={`original-${idx}`}>
                          <p className="text-xs text-gray-500 mb-1 font-medium">
                            Original {img.filename && <span className="text-gray-400">({img.filename})</span>}
                          </p>
                          {img.data && (
                            <div className="border rounded-lg overflow-hidden bg-gray-100">
                              <ClickableScreenshot
                                src={`data:image/png;base64,${img.data}`}
                                alt={`Original: ${img.filename}`}
                                className="w-full h-auto max-h-64 object-contain"
                                onOpen={handleOpenZoom}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    {audit.uploaded_images
                      .filter((img) => img.label === 'localized')
                      .map((img, idx) => (
                        <div key={`localized-${idx}`}>
                          <p className="text-xs text-gray-500 mb-1 font-medium">
                            Localized {img.filename && <span className="text-gray-400">({img.filename})</span>}
                          </p>
                          {img.data && (
                            <div className="border rounded-lg overflow-hidden bg-gray-100">
                              <ClickableScreenshot
                                src={`data:image/png;base64,${img.data}`}
                                alt={`Localized: ${img.filename}`}
                                className="w-full h-auto max-h-64 object-contain"
                                onOpen={handleOpenZoom}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* API Usage & Cost */}
            {audit.api_cost_usd !== null && audit.api_cost_usd !== undefined && (
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    API Cost
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Cost */}
                    <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <span className="text-sm font-medium text-emerald-900">Total Cost</span>
                      <span className="text-lg font-bold text-emerald-700">
                        ${audit.api_cost_usd.toFixed(4)}
                      </span>
                    </div>

                    {/* Token Usage */}
                    <div className="grid grid-cols-2 gap-3">
                      {audit.api_input_tokens !== null && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Input Tokens</p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">
                            {audit.api_input_tokens.toLocaleString()}
                          </p>
                        </div>
                      )}
                      {audit.api_output_tokens !== null && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Output Tokens</p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">
                            {audit.api_output_tokens.toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Duration */}
                    {audit.api_duration_ms !== null && (
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Processing Time</span>
                        <span className="font-medium">
                          {audit.api_duration_ms >= 60000
                            ? `${(audit.api_duration_ms / 60000).toFixed(1)} min`
                            : `${(audit.api_duration_ms / 1000).toFixed(1)} sec`}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Detailed Analysis - Tabbed */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Detailed Analysis</h3>

        <Card>
          {/* Tab Navigation - horizontal scrollable */}
          <div className="px-4 pt-4 border-b border-gray-200">
            <div className="flex overflow-x-auto gap-1 pb-0 -mb-px" role="tablist">
              {sortedResults.map((result) => (
                <TabButton
                  key={result.dimension}
                  result={result}
                  isActive={activeTab === result.dimension}
                  onClick={() => setActiveTab(result.dimension)}
                />
              ))}
            </div>
          </div>

          {/* Tab Content - single dimension */}
          <CardContent className="pt-6">
            {activeResult && (
              <DimensionTabContent
                result={activeResult}
                originalScreenshot={audit.original_screenshot}
                auditScreenshot={audit.audit_screenshot}
                auditType={audit.audit_type || 'comparison'}
                contentPairs={audit.content_pairs}
                onOpenZoom={handleOpenZoom}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full Content Comparison - Only for comparison audits */}
      {audit.audit_type !== 'standalone' && audit.content_pairs && (
        <ContentComparisonTable contentPairs={audit.content_pairs} />
      )}

      {/* Image Zoom Modal */}
      <ImageZoomModal
        imageSrc={zoomImageSrc}
        isOpen={zoomModalOpen}
        onClose={() => setZoomModalOpen(false)}
      />
    </div>
  );
}
