import * as React from "react";
import { cn } from "../../lib/utils";

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-auto rounded-xl border border-slate-200">
      <table
        ref={ref}
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
);
Table.displayName = "Table";

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b-0 bg-slate-50", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

export const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("border-t border-slate-200 bg-slate-50 font-medium", className)}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-slate-100 transition-colors hover:bg-slate-50/50",
      "data-[state=selected]:bg-medical-50",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-11 px-4 text-left align-middle font-semibold text-slate-600 whitespace-nowrap",
      "text-xs uppercase tracking-wider",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("px-4 py-3.5 align-middle text-slate-700", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

export const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-slate-500", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export interface DataTableColumn<T> {
  key: keyof T | string;
  header: React.ReactNode;
  cell?: (row: T, index: number) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey?: keyof T | ((row: T, index: number) => string);
  emptyText?: React.ReactNode;
  onRowClick?: (row: T, index: number) => void;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  emptyText = "暂无数据",
  onRowClick,
  className,
  headerClassName,
  bodyClassName,
}: DataTableProps<T>) {
  const getKey = (row: T, index: number): string => {
    if (typeof rowKey === "function") {
      return rowKey(row, index);
    }
    if (rowKey && rowKey in (row as object)) {
      return String((row as Record<string, unknown>)[rowKey as string]);
    }
    return String(index);
  };

  return (
    <Table className={className}>
      <TableHeader className={headerClassName}>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={String(col.key)} className={col.className}>
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody className={bodyClassName}>
        {data.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="text-center py-12 text-slate-400"
            >
              {emptyText}
            </TableCell>
          </TableRow>
        ) : (
          data.map((row, index) => (
            <TableRow
              key={getKey(row, index)}
              onClick={onRowClick ? () => onRowClick(row, index) : undefined}
              className={onRowClick ? "cursor-pointer" : undefined}
            >
              {columns.map((col) => (
                <TableCell key={String(col.key)} className={col.className}>
                  {col.cell
                    ? col.cell(row, index)
                    : String((row as Record<string, unknown>)[col.key as string] ?? "")}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
