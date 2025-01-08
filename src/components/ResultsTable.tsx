import React, { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import { Search, RefreshCw } from 'lucide-react';
import { fetchApiData } from '../lib/api';
import { updateApiResult } from '../lib/db';

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
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [retrying, setRetrying] = React.useState<string | null>(null);
  const columnHelper = createColumnHelper<Result>();

  const handleRetry = async (result: Result) => {
    try {
      setRetrying(result.id);
      const apiResult = await fetchApiData(result.url);
      const updatedResult = await updateApiResult(result.id, {
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
  };

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
    [columnHelper, retrying]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <div className="w-full">
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-10 w-full p-2 border rounded-lg"
          placeholder="Search results..."
        />
      </div>
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
    </div>
  );
}
