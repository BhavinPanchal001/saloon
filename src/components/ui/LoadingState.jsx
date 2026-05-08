import { Loader2 } from "lucide-react";

/**
 * Loading State Components
 * Provides consistent loading UI across the application
 */

/**
 * Full page loading spinner with optional message
 */
export function PageLoader({ message = "Loading..." }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-navy-500" />
      <p className="text-sm font-medium text-navy-500">{message}</p>
    </div>
  );
}

/**
 * Card/skeleton loading for dashboard/stat cards
 */
export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="glass-card h-32 animate-pulse bg-navy-50/50"
        />
      ))}
    </div>
  );
}

/**
 * Table loading skeleton
 */
export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="table-container">
      <table className="premium-table w-full">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="table-head">
                <div className="h-4 w-20 animate-pulse rounded bg-navy-200/50" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {Array.from({ length: columns }).map((_, colIdx) => (
                <td key={colIdx} className="table-cell">
                  <div className="h-4 w-full animate-pulse rounded bg-navy-100/50" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Inline loading spinner for buttons
 */
export function ButtonSpinner({ size = "sm" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <Loader2 className={`${sizeClasses[size]} animate-spin`} />
  );
}

/**
 * Section loading state with skeleton cards
 */
export function SectionLoader({ title = "Loading data..." }) {
  return (
    <div className="glass-card space-y-6">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-navy-500" />
        <h3 className="font-semibold text-navy-900">{title}</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl bg-navy-50/50"
          />
        ))}
      </div>
    </div>
  );
}

// Alias for backward compatibility
export const LoadingState = PageLoader;
