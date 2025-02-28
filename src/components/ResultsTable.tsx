import React, { useMemo, useState, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import { Search, RefreshCw, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchApiData } from '../lib/api';
import { saveApiResponse } from '../lib/db';
import { PortfolioManager } from './PortfolioManager';

interface Result {
  id: string;
  url: string;
  status: number;
  success: boolean;
  error?: string;
  created_at: string;
  user_id: string;
}

interface ResultsTableProps {
  data: Result[];
}

export function ResultsTable({ data }: ResultsTableProps) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [retrying, setRetrying] = useState<string | null>(null);
  const [portfolioTerms, setPortfolioTerms] = useState<string[]>([]);
  const columnHelper = createColumnHelper<Result>();

  const handleRetry = useCallback(async (result: Result) => {
    try {
      setRetrying(result.id);
      const apiResult = await fetchApiData(result.url);
      const updatedResult = await saveApiResponse({
        ...apiResult,
        user_id: result.user_id
      });
      
      // Update the data in the table
      const index = data.findIndex(item => item.id === result.id);
      if (index !== -1) {
        data[index] = updatedResult;
      }
    } catch (error) {
      console.error('Error retrying request:', error);
    } finally {
      setRetrying(null);
    }
  }, [data]);

  const handleFilterByPortfolio = useCallback((terms: string[]) => {
    setPortfolioTerms(terms);
  }, []);

  const filteredData = useMemo(() => {
    if (portfolioTerms.length === 0) return data;
    
    return data.filter(result => {
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
  }, [data, portfolioTerms]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('url', {
        header: 'URL',
        cell: (info) => (
          <div className="truncate max-w-md" title={info.getValue()}>
            {info.getValue()}
          </div>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('success', {
        header: 'Success',
        cell: (info) => (
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                info.getValue() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {info.getValue() ? 'Success' : 'Failed'}
            </span>
            {!info.getValue() && (
              <button
                onClick={() => handleRetry(info.row.original)}
                disabled={retrying === info.row.original.id}
                className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                title="Retry request"
              >
                <RefreshCw className={`w-4 h-4 ${retrying === info.row.original.id ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        ),
      }),
      columnHelper.accessor('created_at', {
        header: 'Time',
        cell: (info) => new Date(info.getValue()).toLocaleString(),
      }),
    ],
    [columnHelper, retrying, handleRetry]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      globalFilter,
      pagination: {
        pageIndex: 0,
        pageSize: 25,
      },
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 w-full p-2 border rounded-lg"
            placeholder="Search results..."
          />
        </div>
        <PortfolioManager onFilterByPortfolio={handleFilterByPortfolio} />
      </div>
      
      {portfolioTerms.length > 0 && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
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

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getPrePaginationRowModel().rows.length
            )}{' '}
            of {table.getPrePaginationRowModel().rows.length} results
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="p-1 rounded-md border disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="p-1 rounded-md border disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}