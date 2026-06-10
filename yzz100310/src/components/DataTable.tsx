import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react';
import { useState } from 'react';

export interface Column<T> {
  key: string;
  title: ReactNode;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  width?: string;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyText?: string;
  rowClassName?: (row: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  emptyText = '暂无数据',
  rowClassName,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (col: Column<T>) => {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
  };

  let sorted = data;
  if (sortKey) {
    const col = columns.find((c) => c.key === sortKey);
    if (col?.sortable && col.sortValue) {
      sorted = [...data].sort((a, b) => {
        const va = col!.sortValue!(a);
        const vb = col!.sortValue!(b);
        if (typeof va === 'number' && typeof vb === 'number') {
          return sortDir === 'asc' ? va - vb : vb - va;
        }
        return sortDir === 'asc'
          ? String(va).localeCompare(String(vb), 'zh-CN')
          : String(vb).localeCompare(String(va), 'zh-CN');
      });
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-primary/5 text-primary/70">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left font-medium whitespace-nowrap ${col.className ?? ''} ${
                    col.sortable ? 'cursor-pointer select-none hover:bg-primary/10' : ''
                  }`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => handleSort(col)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.title}
                    {col.sortable &&
                      (sortKey === col.key ? (
                        sortDir === 'asc' ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-50" />
                      ))}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-primary/40">
                  {emptyText}
                </td>
              </tr>
            ) : (
              sorted.map((row, idx) => (
                <tr
                  key={rowKey(row)}
                  className={`${idx % 2 === 1 ? 'bg-primary/[0.015]' : ''} ${
                    onRowClick ? 'cursor-pointer hover:bg-primary/5 transition' : ''
                  } ${rowClassName ? rowClassName(row) : ''}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-primary/90 align-top ${col.className ?? ''}`}>
                      {col.render ? col.render(row) : (row as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
