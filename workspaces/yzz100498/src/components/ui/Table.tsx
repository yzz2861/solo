import React from 'react';
import { cn } from '../../lib/utils';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ children, className }) => {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className={cn('w-full text-sm', className)}>
        {children}
      </table>
    </div>
  );
};

interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const TableHeader: React.FC<TableHeaderProps> = ({ children, className }) => {
  return (
    <thead className={cn('bg-gray-50 border-b border-gray-200', className)}>
      {children}
    </thead>
  );
};

interface TableBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const TableBody: React.FC<TableBodyProps> = ({ children, className }) => {
  return (
    <tbody className={cn('divide-y divide-gray-100', className)}>
      {children}
    </tbody>
  );
};

interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const TableRow: React.FC<TableRowProps> = ({ children, className, hover }) => {
  return (
    <tr className={cn(hover && 'hover:bg-gray-50 transition-colors', className)}>
      {children}
    </tr>
  );
};

interface TableHeadProps {
  children: React.ReactNode;
  className?: string;
}

export const TableHead: React.FC<TableHeadProps> = ({ children, className }) => {
  return (
    <th className={cn(
      'px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider',
      className
    )}>
      {children}
    </th>
  );
};

interface TableCellProps {
  children: React.ReactNode;
  className?: string;
}

export const TableCell: React.FC<TableCellProps> = ({ children, className }) => {
  return (
    <td className={cn('px-4 py-3 text-gray-700', className)}>
      {children}
    </td>
  );
};
