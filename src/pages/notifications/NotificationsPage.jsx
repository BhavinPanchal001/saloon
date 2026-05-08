import { useState, useEffect } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { useToastStore } from "../../stores/toastStore";
import { Bell, Check, Trash2, AlertCircle, Info, CheckCircle, Clock } from "lucide-react";

const notificationIcons = {
  alert: AlertCircle,
  info: Info,
  success: CheckCircle,
  warning: Clock,
};

const notificationColors = {
  alert: "text-rose-600 bg-rose-50",
  info: "text-blue-600 bg-blue-50",
  success: "text-emerald-600 bg-emerald-50",
  warning: "text-amber-600 bg-amber-50",
};

export function NotificationsPage() {
  const toast = useToastStore();
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Low Stock Alert",
      message: "Product 'Hair Color - Premium Black' is running low (5 units remaining)",
      type: "alert",
      read: false,
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    },
    {
      id: 2,
      title: "Purchase Order Approved",
      message: "PO #PO-2024-001 has been approved by admin",
      type: "success",
      read: false,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    },
    {
      id: 3,
      title: "Staff Schedule Updated",
      message: "Employee Priya Sharma's schedule has been updated for next week",
      type: "info",
      read: true,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    },
    {
      id: 4,
      title: "Contract Expiring Soon",
      message: "Employee contract for 'Rahul Kumar' expires in 7 days",
      type: "warning",
      read: false,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    },
    {
      id: 5,
      title: "New Employee Added",
      message: "Welcome! New employee 'Anjali Patel' has been onboarded",
      type: "success",
      read: true,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
    },
  ]);

  const [filter, setFilter] = useState("all"); // all, unread, read

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    toast.success("Notification marked as read");
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast.success("Notification deleted");
  };

  const clearAll = () => {
    setNotifications([]);
    toast.success("All notifications cleared");
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === "unread") return !n.read;
    if (filter === "read") return n.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Notifications"
        title="Notification Center"
        description={`You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`}
        action={
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="btn-premium-outline flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                Mark All Read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="btn-ghost flex items-center gap-2 text-rose-600 hover:text-rose-700"
              >
                <Trash2 className="h-4 w-4" />
                Clear All
              </button>
            )}
          </div>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {[
          { id: "all", label: "All", count: notifications.length },
          { id: "unread", label: "Unread", count: unreadCount },
          { id: "read", label: "Read", count: notifications.length - unreadCount },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${
              filter === tab.id
                ? "text-navy-900"
                : "text-slate-500 hover:text-navy-700"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                  filter === tab.id
                    ? "bg-navy-100 text-navy-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            )}
            {filter === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold-500" />
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="glass-card py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <Bell className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-navy-900">
              {filter === "unread"
                ? "No unread notifications"
                : filter === "read"
                ? "No read notifications"
                : "No notifications"}
            </h3>
            <p className="mt-1 text-slate-500">
              {filter === "unread"
                ? "You're all caught up!"
                : "Notifications will appear here"}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            const Icon = notificationIcons[notification.type] || Info;
            const colorClass = notificationColors[notification.type] || notificationColors.info;

            return (
              <div
                key={notification.id}
                className={`glass-card overflow-hidden transition-all ${
                  notification.read ? "opacity-75" : ""
                }`}
              >
                <div className="flex items-start gap-4 p-5">
                  {/* Icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorClass}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-semibold text-navy-900">
                          {notification.title}
                          {!notification.read && (
                            <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-rose-500" />
                          )}
                        </h4>
                        <p className="mt-1 text-sm text-slate-600">
                          {notification.message}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          {formatTime(notification.timestamp)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-600"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
