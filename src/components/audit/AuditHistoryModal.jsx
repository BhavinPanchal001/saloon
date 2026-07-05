import { useState, useEffect } from "react";
import { Clock, User, Package, Store, ArrowUpDown, X } from "lucide-react";
import { Modal } from "../ui/Modal";
import { formatCurrency } from "../../utils/format";
import { fetchEntityAuditTrailFromAPI } from "../../services/api";

export function AuditHistoryModal({ 
  isOpen, 
  onClose, 
  entityType, 
  entityId, 
  entityName,
  maxItems = 50 
}) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadAuditLogs = async () => {
    if (!entityType || !entityId) return;
    
    setLoading(true);
    setError("");
    
    try {
      const params = {
        limit: maxItems,
        includeDetails: "true"
      };

      const data = await fetchEntityAuditTrailFromAPI(entityType, entityId, params);
      setAuditLogs(data.data || []);
    } catch (err) {
      setError(err.message || "Failed to load audit history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAuditLogs();
    }
  }, [isOpen, entityType, entityId]);

  const getOperationIcon = (operation) => {
    switch (operation) {
      case "CREATE":
        return <Package className="h-4 w-4 text-emerald-500" />;
      case "UPDATE":
        return <ArrowUpDown className="h-4 w-4 text-blue-500" />;
      case "DELETE":
        return <X className="h-4 w-4 text-rose-500" />;
      case "STOCK_ISSUE":
        return <Store className="h-4 w-4 text-purple-500" />;
      case "STOCK_ADJUST":
        return <ArrowUpDown className="h-4 w-4 text-amber-500" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  const getOperationColor = (operation) => {
    switch (operation) {
      case "CREATE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "UPDATE":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "DELETE":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "STOCK_ISSUE":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "STOCK_ADJUST":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const formatChangedFields = (changedFields) => {
    if (!changedFields || !Array.isArray(changedFields)) return null;
    
    return (
      <div className="mt-2 space-y-1">
        {changedFields.map((field, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs">
            <span className="font-medium text-slate-600">{field.field}:</span>
            <span className="text-slate-500 line-through">{field.old_value}</span>
            <span className="text-navy-600">→</span>
            <span className="text-navy-700 font-medium">{field.new_value}</span>
          </div>
        ))}
      </div>
    );
  };



  const formatMetadata = (metadata) => {
    if (!metadata || typeof metadata !== 'object') return null;
    
    // Filter out internal database ID keys (keys ending in ID or equal to ID)
    const entries = Object.entries(metadata).filter(([key]) => {
      const lowerKey = key.toLowerCase();
      return !lowerKey.endsWith('id') && lowerKey !== 'id';
    });

    if (entries.length === 0) return null;

    const formatKey = (key) => {
      return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .replace('Id', 'ID')
        .replace('Po', 'PO');
    };

    const formatValue = (key, val) => {
      if (val === null || val === undefined) return '—';
      if (typeof val === 'object') return JSON.stringify(val);
      if (typeof val === 'boolean') return val ? 'Yes' : 'No';
      if (key.toLowerCase().includes('price') || key.toLowerCase().includes('cost')) {
        return formatCurrency(val);
      }
      if (key === 'operation' && typeof val === 'string') {
        return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      }
      return String(val);
    };

    return (
      <div className="mt-2 space-y-1.5 bg-slate-50 rounded-lg p-3 border border-slate-100 max-w-md">
        <div className="font-semibold text-slate-500 mb-1.5 text-[10px] uppercase tracking-wider">Details</div>
        <div className="flex flex-col gap-2 text-xs">
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-center gap-2 py-0.5 border-b border-dashed border-slate-200 last:border-0 pb-1.5 last:pb-0">
              <span className="font-medium text-slate-500">{formatKey(key)}:</span>
              <span className="text-slate-800 font-semibold">{formatValue(key, value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Audit History" size="xl">
      <div className="space-y-4">
        {/* Header Info */}
        <div className="bg-navy-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-navy-900">{entityName}</h3>
              <p className="text-sm text-slate-600">
                Type: <span className="font-medium">{entityType?.replace('_', ' ')}</span> • ID: {entityId}
              </p>
            </div>
            <button
              onClick={loadAuditLogs}
              disabled={loading}
              className="btn-premium-outline !py-2 !px-3 text-xs"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-600"></div>
          </div>
        )}

        {/* Audit Logs List */}
        {!loading && !error && (
          <>
            {auditLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No audit history found</p>
                <p className="text-sm">No changes have been recorded for this item</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="border border-slate-200 rounded-lg p-4 bg-white">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {getOperationIcon(log.operation)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getOperationColor(log.operation)}`}>
                              {log.operation}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                          
                          <div className="text-sm">
                            {log.user_email && (
                              <div className="flex items-center gap-1 text-slate-600">
                                <User className="h-3 w-3" />
                                <span>{log.user_email}</span>
                              </div>
                            )}
                            
                            {log.quantity_change && (
                              <div className="mt-1 font-medium">
                                Quantity change: {log.quantity_change > 0 ? '+' : ''}{log.quantity_change}
                              </div>
                            )}

                            {log.metadata && formatMetadata(log.metadata)}

                            {formatChangedFields(log.changed_fields)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-200">
          <div className="text-xs text-slate-400">
            {auditLogs.length} record{auditLogs.length !== 1 ? 's' : ''} found
          </div>
          <button
            onClick={onClose}
            className="btn-premium-primary"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
