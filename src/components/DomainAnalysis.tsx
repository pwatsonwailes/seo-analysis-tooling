import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { analyzeDomains } from '../utils/domainAnalysis';
import type { ParsedResult, DomainStats } from '../types';

interface DomainAnalysisProps {
  results: ParsedResult[];
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
                  {stat.occurrences} appearances • Avg. position: {stat.averagePosition.toFixed(1)}
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
                  <h4 className="font-medium mb-2">Queries ({stat.queries.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {stat.queries.map((query) => (
                      <span 
                        key={query}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {query}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">URLs ({stat.uniqueUrls.length})</h4>
                  <div className="space-y-2">
                    {stat.uniqueUrls.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-blue-600 hover:underline truncate"
                      >
                        {url}
                      </a>
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