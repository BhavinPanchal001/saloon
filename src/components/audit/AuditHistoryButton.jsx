import { Clock, Eye } from "lucide-react";

export function AuditHistoryButton({ 
  onClick, 
  size = "sm", 
  variant = "outline",
  showText = true,
  className = "" 
}) {
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-sm"
  };

  const variantClasses = {
    outline: "border border-navy-200 bg-white text-navy-700 hover:bg-navy-50",
    primary: "bg-navy-600 text-white hover:bg-navy-700",
    ghost: "text-navy-600 hover:bg-navy-50"
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      title="View audit history"
    >
      <Clock className="h-3 w-3" />
      {showText && <span>History</span>}
      {!showText && <Eye className="h-3 w-3" />}
    </button>
  );
}
