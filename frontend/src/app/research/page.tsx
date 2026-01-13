'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Header } from '@/components/layout/Header';
import { categories, stats, type Company, type Category, type EvidenceLink } from '@/data/wellnessCompanies';

function ScoreBadge({ score, type }: { score?: number; type: 'korea' | 'japan' }) {
  if (score === undefined) return null;

  const colors = {
    5: 'bg-green-100 text-green-800 border-green-200',
    4: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    3: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    2: 'bg-orange-100 text-orange-800 border-orange-200',
    1: 'bg-red-100 text-red-800 border-red-200',
    0: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const flag = type === 'korea' ? '🇰🇷' : '🇯🇵';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colors[score as keyof typeof colors]}`}>
      {flag} {score}/5
    </span>
  );
}

function EvidenceLinks({ links }: { links?: EvidenceLink[] }) {
  if (!links || links.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {links.map((link, idx) => (
        <a
          key={idx}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-800 transition-colors"
        >
          {link.label}
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      ))}
    </div>
  );
}

function EvidenceCell({ evidence, links, country }: {
  evidence?: string;
  links?: EvidenceLink[];
  country: 'korea' | 'japan';
}) {
  if (!evidence && (!links || links.length === 0)) return null;

  const flag = country === 'korea' ? '🇰🇷' : '🇯🇵';
  const label = country === 'korea' ? 'Korea' : 'Japan';

  return (
    <div className="mb-2 last:mb-0">
      <div className="flex items-start gap-1">
        <span className="text-sm">{flag}</span>
        <div className="flex-1">
          <span className="text-xs font-medium text-gray-700">{label}:</span>
          {evidence && (
            <span className="text-xs text-gray-600 ml-1">{evidence}</span>
          )}
          <EvidenceLinks links={links} />
        </div>
      </div>
    </div>
  );
}

function CompanyRow({ company }: { company: Company }) {
  const hasKoreaEvidence = company.koreaEvidence || (company.koreaLinks && company.koreaLinks.length > 0);
  const hasJapanEvidence = company.japanEvidence || (company.japanLinks && company.japanLinks.length > 0);
  const hasAnyEvidence = hasKoreaEvidence || hasJapanEvidence || company.funding;

  return (
    <tr className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
      <td className="px-4 py-3">
        <div className="font-medium text-gray-900">{company.name}</div>
        <div className="text-xs text-gray-500">{company.hq}</div>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
          {company.category}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 max-w-md">
        {company.description}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <ScoreBadge score={company.koreaScore} type="korea" />
          <ScoreBadge score={company.japanScore} type="japan" />
        </div>
      </td>
      <td className="px-4 py-3 max-w-sm">
        {hasAnyEvidence ? (
          <div>
            <EvidenceCell
              evidence={company.koreaEvidence}
              links={company.koreaLinks}
              country="korea"
            />
            <EvidenceCell
              evidence={company.japanEvidence}
              links={company.japanLinks}
              country="japan"
            />
            {company.funding && !hasKoreaEvidence && !hasJapanEvidence && (
              <div className="text-xs text-gray-500">Funding: {company.funding}</div>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        )}
      </td>
    </tr>
  );
}

function CategorySection({ category, searchTerm }: { category: Category; searchTerm: string }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const filteredCompanies = useMemo(() => {
    if (!searchTerm) return category.companies;
    const term = searchTerm.toLowerCase();
    return category.companies.filter(
      c => c.name.toLowerCase().includes(term) ||
           c.category.toLowerCase().includes(term) ||
           c.description.toLowerCase().includes(term) ||
           c.hq.toLowerCase().includes(term)
    );
  }, [category.companies, searchTerm]);

  if (filteredCompanies.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader
        className="cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {category.name}
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({filteredCompanies.length} companies)
            </span>
          </CardTitle>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </CardHeader>
      {isExpanded && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-y border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Presence</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((company, idx) => (
                <CompanyRow key={`${category.id}-${idx}`} company={company} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className="text-2xl">{icon}</div>
        <div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

export default function ResearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredCategories = useMemo(() => {
    if (categoryFilter === 'all') return categories;
    return categories.filter(c => c.id === categoryFilter);
  }, [categoryFilter]);

  const totalFilteredCompanies = useMemo(() => {
    let count = 0;
    const term = searchTerm.toLowerCase();
    filteredCategories.forEach(cat => {
      cat.companies.forEach(c => {
        if (!term ||
            c.name.toLowerCase().includes(term) ||
            c.category.toLowerCase().includes(term) ||
            c.description.toLowerCase().includes(term)) {
          count++;
        }
      });
    });
    return count;
  }, [filteredCategories, searchTerm]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Wellness Companies Research</h2>
            <p className="text-gray-500">Korea & Japan Market Presence Database</p>
          </div>
          <div className="text-sm text-gray-500">
            Research Date: {stats.researchDate}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard icon="📊" label="Total Companies" value={stats.totalCompanies} />
          <StatCard icon="🇰🇷" label="Foreign → Korea" value={stats.foreignKoreaPresence} />
          <StatCard icon="🇯🇵" label="Foreign → Japan" value={stats.foreignJapanPresence} />
          <StatCard icon="🏢" label="Korean Origin" value={stats.koreanOrigin} />
          <StatCard icon="🗾" label="Japanese Origin" value={stats.japaneseOrigin} />
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search companies, categories, or descriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="w-full md:w-64">
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">All Categories ({stats.totalCompanies})</option>
                  <optgroup label="Foreign Presence">
                    <option value="foreign-korea-strong">Strong Korea Presence (4-5)</option>
                    <option value="foreign-korea-none">No/Passive Korea Presence</option>
                    <option value="foreign-japan-strong">Strong Japan Presence (4-5)</option>
                  </optgroup>
                  <optgroup label="Korean Companies">
                    <option value="korean-digital-health">Digital Health</option>
                    <option value="korean-telehealth">Telehealth</option>
                    <option value="korean-meditation">Meditation/Mental Health</option>
                    <option value="korean-femtech">Femtech</option>
                    <option value="korean-supplements">Supplements</option>
                    <option value="korean-fitness-apps">Fitness/Walking Apps</option>
                    <option value="k-beauty-wellness">K-Beauty/Wellness</option>
                    <option value="dhp-portfolio">DHP Portfolio</option>
                    <option value="korean-vcs">Korean VCs</option>
                  </optgroup>
                  <optgroup label="Japanese Companies">
                    <option value="japanese-health-apps">Health/Fitness Apps</option>
                    <option value="japanese-digital-health">Digital Health Startups</option>
                    <option value="japanese-agetech">Senior Care/AgeTech</option>
                  </optgroup>
                </select>
              </div>
            </div>
            {searchTerm && (
              <div className="mt-2 text-sm text-gray-500">
                Showing {totalFilteredCompanies} results for "{searchTerm}"
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-white rounded-lg border border-gray-200">
          <span className="text-sm text-gray-600 font-medium">Presence Score:</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">5 = Very Strong</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">4 = Strong</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">3 = Moderate</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">2 = Limited</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">1 = Passive</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">0 = None</span>
        </div>

        {/* Company Lists */}
        {filteredCategories.map(category => (
          <CategorySection
            key={category.id}
            category={category}
            searchTerm={searchTerm}
          />
        ))}

        {/* Data Sources */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Data Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Databases</h4>
                <ul className="space-y-1">
                  <li>• Crunchbase</li>
                  <li>• CB Insights</li>
                  <li>• Bloomberg</li>
                  <li>• ZoomInfo</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Registries</h4>
                <ul className="space-y-1">
                  <li>• DART (Korea)</li>
                  <li>• NTA Corporate Number (Japan)</li>
                  <li>• App Store Rankings</li>
                  <li>• Google Play Rankings</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Reports</h4>
                <ul className="space-y-1">
                  <li>• IMARC Group</li>
                  <li>• Grand View Research</li>
                  <li>• Ken Research</li>
                  <li>• Global Wellness Institute</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
