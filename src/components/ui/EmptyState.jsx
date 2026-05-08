import { Inbox, Search, FileX, AlertCircle, FolderOpen } from "lucide-react";

/**
 * Empty State Components
 * Provides consistent empty state UI across the application
 */

const iconMap = {
  inbox: Inbox,
  search: Search,
  file: FileX,
  alert: AlertCircle,
  folder: FolderOpen,
};

/**
 * Generic empty state with customizable icon, title, and action
 */
export function EmptyState({
  icon: IconProp,
  iconName = "inbox",
  title = "No items found",
  description = "There are no items to display at the moment.",
  action,
}) {
  const Icon = IconProp || iconMap[iconName] || Inbox;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 rounded-full bg-navy-50 p-4">
        <Icon className="h-8 w-8 text-navy-400" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-navy-900">{title}</h3>
      <p className="mb-6 max-w-md text-sm text-navy-500">{description}</p>
      {action && <div className="flex gap-3">{action}</div>}
    </div>
  );
}

/**
 * Empty state for search results with no matches
 */
export function NoSearchResults({ query, onClear }) {
  return (
    <EmptyState
      iconName="search"
      title="No results found"
      description={`No items match your search for "${query}". Try different keywords or filters.`}
      action={
        onClear && (
          <button onClick={onClear} className="btn-premium-outline">
            Clear Search
          </button>
        )
      }
    />
  );
}

/**
 * Empty state for tables with no data
 */
export function EmptyTable({
  title = "No data available",
  description = "Get started by adding your first item.",
  actionLabel,
  onAction,
}) {
  return (
    <EmptyState
      iconName="folder"
      title={title}
      description={description}
      action={
        onAction && (
          <button onClick={onAction} className="btn-premium-primary">
            {actionLabel || "Add Item"}
          </button>
        )
      }
    />
  );
}

/**
 * Error state with retry action
 */
export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load the data. Please try again.",
  onRetry,
}) {
  return (
    <EmptyState
      iconName="alert"
      title={title}
      description={description}
      action={
        onRetry && (
          <button onClick={onRetry} className="btn-premium-primary">
            Try Again
          </button>
        )
      }
    />
  );
}
