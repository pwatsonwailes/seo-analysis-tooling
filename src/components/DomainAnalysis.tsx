import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, Filter, ArrowUpDown } from 'lucide-react';
import { analyzeDomains } from '../utils/domainAnalysis';
import { PortfolioManager } from './PortfolioManager';
import type { ParsedResult, DomainStats } from '../types';

interface DomainAnalysisProps {
  results: ParsedResult[];
}

type SortField = 'domain' | 'occurrences' | 'averagePosition' | 'totalEstimatedTraffic';
type SortDirection = 'asc' | 'desc';

function UrlRankingsList({ rankings }: { rankings: { term: string; position: number; searchVolume: number; estimatedTraffic: number }[] }) {
  return (
    <div className="space-y-1">
      {rankings.map(({ term, position, searchVolume, estimatedTraffic }, index) => (
        <div key={`${term}-${position}-${index}`} className="text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700">"{term}"</span>
            <div className="flex items-center gap-4">
              <div className="text-gray-600">
                <span className="font-medium">Position:</span> {position}
              </div>
              <div className="text-gray-600">
                <span className="font-medium">Est. Traffic:</span> {estimatedTraffic.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SortButton({ 
  field, 
  currentField, 
  direction, 
  label, 
  onClick 
}: { 
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
  label: string;
  onClick: (field: SortField) => void;
}) {
  return (
    <button
      onClick={() => onClick(field)}
      className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
    >
      {label}
      {field === currentField ? (
        direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
      ) : (
        <ArrowUpDown className="w-4 h-4 text-gray-400" />
      )}
    </button>
  );
}

export function DomainAnalysis({ results }: DomainAnalysisProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [portfolioTerms, setPortfolioTerms] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('totalEstimatedTraffic');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const filteredResults = useMemo(() => {
    if (portfolioTerms.length === 0) return results;
    
    return results.filter(result => {
      try {
        const contents = JSON.parse(result.response_data.contents || '{}');
        const query = contents.search_parameters?.query || '';
        
        // Check for partial matches
        return portfolioTerms.some(term => {
          const normalizedQuery = query.toLowerCase();
          const normalizedTerm = term.toLowerCase();
          return normalizedQuery.includes(normalizedTerm) || normalizedTerm.includes(normalizedQuery);
        });
      } catch {
        return false;
      }
    });
  }, [results, portfolioTerms]);

  const domainStats = useMemo(() => analyzeDomains(filteredResults), [filteredResults]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedStats = useMemo(() => {
    const sorted = [...domainStats].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'domain':
          comparison = a.domain.localeCompare(b.domain);
          break;
        case 'occurrences':
          comparison = a.occurrences - b.occurrences;
          break;
        case 'averagePosition':
          comparison = a.averagePosition - b.averagePosition;
          break;
        case 'totalEstimatedTraffic':
          comparison = a.totalEstimatedTraffic - b.totalEstimatedTraffic;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    if (searchTerm) {
      return sorted.filter(stat => 
        stat.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stat.queries.some(q => q.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return sorted;
  }, [domainStats, sortField, sortDirection, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search domains or queries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full p-2 border rounded-lg"
          />
        </div>
        <PortfolioManager onFilterByPortfolio={setPortfolioTerms} />
      </div>

      {portfolioTerms.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-2 rounded-lg">
          <Filter className="w-4 h-4" />
          <span>Filtering by portfolio ({portfolioTerms.length} terms)</span>
          <button
            onClick={() => setPortfolioTerms([])}
            className="text-blue-500 hover:text-blue-700"
          >
            Clear filter
          </button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 border-b pb-2">
        <SortButton
          field="domain"
          currentField={sortField}
          direction={sortDirection}
          label="Domain"
          onClick={handleSort}
        />
        <SortButton
          field="occurrences"
          currentField={sortField}
          direction={sortDirection}
          label="Appearances"
          onClick={handleSort}
        />
        <SortButton
          field="averagePosition"
          currentField={sortField}
          direction={sortDirection}
          label="Avg. Position"
          onClick={handleSort}
        />
        <SortButton
          field="totalEstimatedTraffic"
          currentField={sortField}
          direction={sortDirection}
          label="Est. Traffic"
          onClick={handleSort}
        />
      </div>

      <div className="space-y-2">
        {sortedStats.map((stat) => (
          <div key={stat.domain} className="border rounded-lg p-4">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedDomain(expandedDomain === stat.domain ? null : stat.domain)}
            >
              <div className="flex-1 grid grid-cols-4 gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{stat.domain}</h3>
                </div>
                <div className="text-gray-600">
                  {stat.occurrences} appearances
                </div>
                <div className="text-gray-600">
                  Avg. position: {stat.averagePosition.toFixed(1)}
                </div>
                <div className="text-gray-600">
                  Est. traffic: {stat.totalEstimatedTraffic.toLocaleString()}
                </div>
              </div>
              {expandedDomain === stat.domain ? (
                <ChevronUp className="w-5 h-5 ml-4" />
              ) : (
                <ChevronDown className="w-5 h-5 ml-4" />
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