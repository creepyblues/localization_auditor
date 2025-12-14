'use client';

import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import type { ContentPairs, ContentPairItem, ContentPairImage } from '@/types';

interface ContentComparisonTableProps {
  contentPairs: ContentPairs;
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ComparisonRow({
  original,
  localized,
  badge,
}: {
  original?: string;
  localized?: string;
  badge?: string;
}) {
  if (!original && !localized) return null;

  return (
    <div className="grid grid-cols-2 gap-4 text-sm p-3 bg-gray-50 rounded-lg border border-gray-100">
      <div className="break-words">
        {badge && (
          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded mr-2 font-medium">
            {badge}
          </span>
        )}
        <span className="text-gray-700">{original || <em className="text-gray-400">N/A</em>}</span>
      </div>
      <div className="break-words">
        <span className="text-gray-900">{localized || <em className="text-gray-400">N/A</em>}</span>
      </div>
    </div>
  );
}

function ContentSection({
  title,
  count,
  children,
  defaultExpanded = false,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border-b border-gray-200 py-3 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex justify-between items-center w-full text-left hover:bg-gray-50 -mx-2 px-2 py-1 rounded"
      >
        <span className="font-medium text-gray-700">
          {title}{' '}
          {count !== undefined && count > 0 && (
            <span className="text-gray-400 font-normal">({count})</span>
          )}
        </span>
        <ChevronIcon expanded={expanded} />
      </button>
      {expanded && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  );
}

export function ContentComparisonTable({ contentPairs }: ContentComparisonTableProps) {
  const headingCount = contentPairs.headings?.filter(h => h.original || h.localized).length || 0;
  const paragraphCount = contentPairs.paragraphs?.filter(p => p.original || p.localized).length || 0;
  const buttonCount = contentPairs.buttons?.filter(b => b.original || b.localized).length || 0;
  const linkCount = contentPairs.links?.filter(l => l.original || l.localized).length || 0;
  const imageCount = contentPairs.images?.filter(i => i.original_alt || i.localized_alt).length || 0;

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-gray-900">Full Content Comparison</h3>
        <p className="text-sm text-gray-500">Side-by-side view of all analyzed content</p>
      </CardHeader>
      <CardContent>
        {/* Header row */}
        <div className="grid grid-cols-2 gap-4 mb-4 pb-2 border-b border-gray-200">
          <div className="font-medium text-gray-600 text-sm">Original</div>
          <div className="font-medium text-gray-600 text-sm">Localized</div>
        </div>

        {/* Title */}
        {(contentPairs.title?.original || contentPairs.title?.localized) && (
          <ContentSection title="Page Title" defaultExpanded={true}>
            <ComparisonRow
              original={contentPairs.title?.original}
              localized={contentPairs.title?.localized}
            />
          </ContentSection>
        )}

        {/* Meta Description */}
        {(contentPairs.meta_description?.original || contentPairs.meta_description?.localized) && (
          <ContentSection title="Meta Description" defaultExpanded={true}>
            <ComparisonRow
              original={contentPairs.meta_description?.original}
              localized={contentPairs.meta_description?.localized}
            />
          </ContentSection>
        )}

        {/* Meta Keywords */}
        {(contentPairs.meta_keywords?.original || contentPairs.meta_keywords?.localized) && (
          <ContentSection title="Meta Keywords">
            <ComparisonRow
              original={contentPairs.meta_keywords?.original}
              localized={contentPairs.meta_keywords?.localized}
            />
          </ContentSection>
        )}

        {/* Headings */}
        {headingCount > 0 && (
          <ContentSection title="Headings" count={headingCount}>
            {contentPairs.headings
              ?.filter(h => h.original || h.localized)
              .map((pair, idx) => (
                <ComparisonRow
                  key={idx}
                  original={pair.original}
                  localized={pair.localized}
                  badge={`H${pair.level || 1}`}
                />
              ))}
          </ContentSection>
        )}

        {/* Paragraphs */}
        {paragraphCount > 0 && (
          <ContentSection title="Paragraphs" count={paragraphCount}>
            {contentPairs.paragraphs
              ?.filter(p => p.original || p.localized)
              .map((pair, idx) => (
                <ComparisonRow key={idx} original={pair.original} localized={pair.localized} />
              ))}
          </ContentSection>
        )}

        {/* Buttons */}
        {buttonCount > 0 && (
          <ContentSection title="Buttons / CTAs" count={buttonCount}>
            {contentPairs.buttons
              ?.filter(b => b.original || b.localized)
              .map((pair, idx) => (
                <ComparisonRow key={idx} original={pair.original} localized={pair.localized} />
              ))}
          </ContentSection>
        )}

        {/* Links */}
        {linkCount > 0 && (
          <ContentSection title="Link Texts" count={linkCount}>
            {contentPairs.links
              ?.filter(l => l.original || l.localized)
              .map((pair, idx) => (
                <ComparisonRow key={idx} original={pair.original} localized={pair.localized} />
              ))}
          </ContentSection>
        )}

        {/* Images */}
        {imageCount > 0 && (
          <ContentSection title="Image Alt Texts" count={imageCount}>
            {contentPairs.images
              ?.filter(i => i.original_alt || i.localized_alt)
              .map((pair, idx) => (
                <ComparisonRow
                  key={idx}
                  original={pair.original_alt}
                  localized={pair.localized_alt}
                />
              ))}
          </ContentSection>
        )}
      </CardContent>
    </Card>
  );
}
