'use client';

import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { ContentComparisonTable } from './ContentComparisonTable';
import type { Audit, AuditResult, AuditDimension, AuditFinding, GoodExample } from '@/types';
import { DIMENSION_LABELS, DIMENSION_DESCRIPTIONS } from '@/types';

interface AuditResultsProps {
  audit: Audit;
}

function FindingCard({ finding }: { finding: AuditFinding }) {
  const severityColors = {
    high: 'bg-red-50 border-red-200',
    medium: 'bg-yellow-50 border-yellow-200',
    low: 'bg-orange-50 border-orange-200',
  };

  const severityBadgeColors = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className={`p-3 rounded-lg border ${severityColors[finding.severity]}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-900">{finding.issue}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${severityBadgeColors[finding.severity]}`}>
          {finding.severity}
        </span>
      </div>

      <div className="mt-2 text-xs space-y-1 font-mono bg-white/70 p-2 rounded border border-gray-100">
        {finding.original && (
          <div className="flex gap-2">
            <span className="text-gray-500 shrink-0 w-16">original:</span>
            <span className="text-gray-800">"{finding.original}"</span>
          </div>
        )}
        {finding.localized && (
          <div className="flex gap-2">
            <span className="text-gray-500 shrink-0 w-16">localized:</span>
            <span className="text-gray-800">"{finding.localized}"</span>
          </div>
        )}
        {finding.suggestion && (
          <div className="flex gap-2 pt-1 border-t border-gray-200 mt-1">
            <span className="text-green-600 shrink-0 w-16">suggestion:</span>
            <span className="text-green-700 font-medium">"{finding.suggestion}"</span>
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

function DimensionCard({ result }: { result: AuditResult }) {
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
                <FindingCard key={idx} finding={finding} />
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
      </CardContent>
    </Card>
  );
}

export function AuditResults({ audit }: AuditResultsProps) {
  if (!audit.results || audit.results.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          No results available yet.
        </CardContent>
      </Card>
    );
  }

  // Sort results by score (lowest first to highlight issues)
  const sortedResults = [...audit.results].sort((a, b) => a.score - b.score);

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-8">
            <ScoreRing score={audit.overall_score || 0} size="lg" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Overall Score</h2>
              <p className="text-gray-500 mt-1">
                Based on {audit.results.length} quality dimensions
              </p>
              <div className="flex gap-4 mt-4 text-sm">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                  <span>80+: Excellent</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span>60-79: Good</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-orange-500" />
                  <span>40-59: Fair</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span>&lt;40: Poor</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Summary Bar */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-gray-900">Score Breakdown</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedResults.map((result) => (
              <div key={result.dimension} className="flex items-center gap-4">
                <span className="w-40 text-sm text-gray-700">
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
                <span className="w-12 text-sm font-medium text-right">{result.score}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Analysis</h3>
        <div className="grid gap-6 md:grid-cols-2">
          {sortedResults.map((result) => (
            <DimensionCard key={result.dimension} result={result} />
          ))}
        </div>
      </div>

      {/* Full Content Comparison */}
      {audit.content_pairs && (
        <ContentComparisonTable contentPairs={audit.content_pairs} />
      )}
    </div>
  );
}
