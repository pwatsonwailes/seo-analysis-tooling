import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { analyzeDomains } from '../utils/domainAnalysis';
import type { ParsedResult, DomainStats } from '../types';

interface DomainAnalysisProps {
  results: ParsedResult[];
}

function UrlRankingsList({ rankings }: { rankings: { term: string; position: number }[] }) {
  return (
    <div className="space-y-1">
      {rankings.map(({ term, position }, index) => (
        <div key={`${term}-${position}-${index}`} className="text-sm">
          <span className="font-medium text-gray-700">"{term}"</span>
          <span className="text-gray-500"> - Position </span>
          <span className="font-medium text-blue-600">{position}</span>
        </div>
      ))}
    </div>
  );
}

export function DomainAnalysis({ results }: DomainAnalysisProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  const domainStats = useMemo(() => analyzeDomains(results), [results]);

  const filteredStats = useMemo(() => 
    domainStats.filter(stat => 
      stat.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stat.queries.some(q => q.toLowerCase().includes(searchTerm.toLowerCase()))
    ),
    [domainStats, searchTerm]
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search domains or queries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 w-full p-2 border rounded-lg"
        />
      </div>

      <div className="space-y-2">
        {filteredStats.map((stat) => (
          <div key={stat.domain} className="border rounded-lg p-4">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedDomain(expandedDomain === stat.domain ? null : stat.domain)}
            >
              <div>
                <h3 className="text-lg font-semibold">{stat.domain}</h3>
                <div className="text-sm text-gray-600">
                  {stat.occurrences} appearances • Avg. position: {stat.averagePosition}
                </div>
              </div>
              {expandedDomain === stat.domain ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </div>

            {expandedDomain === stat.domain && (
              <div className="mt-4 space-y-4">
                <div>
                  <h4 className="font-medium mb-2">URLs and Rankings</h4>
                  <div className="space-y-4">
                    {stat.urlRankings.map(({ url, rankings }) => (
                      <div key={url} className="pl-4 border-l-2 border-gray-200">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline break-all"
                        >
                          {url}
                        </a>
                        <div className="mt-2">
                          <UrlRankingsList rankings={rankings} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}