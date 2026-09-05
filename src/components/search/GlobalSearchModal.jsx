import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  X,
  Loader2,
  Clock,
  ArrowRight,
  CornerDownLeft,
  Users,
  Scissors,
  Package,
  Receipt,
  UserCheck,
  Boxes,
  Calendar,
  Compass,
  Store,
  Tag,
  Settings,
  CreditCard,
  ClipboardList,
  Ruler,
  CalendarCheck,
  DollarSign,
  Wallet,
  BarChart2,
  Ticket,
  Monitor,
  History,
  Shield,
  Lock,
  FileText,
  Building2,
  Bell,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useSearchStore } from "../../stores/searchStore";
import { useAuthStore } from "../../stores/authStore";
import { globalSearchAPI } from "../../services/api";

const APP_PAGES = [
  { id: "page-pos", title: "Point of Sale (POS)", subtitle: "Create new bill, cart, checkout", category: "pages", url: "/pos", icon: CreditCard, shortcut: "Alt+P", roles: ["admin", "super_admin", "manager", "cashier", "pos"] },
  { id: "page-bills", title: "Billing History", subtitle: "View past sales, invoices, reprints", category: "pages", url: "/pos/bills", icon: Receipt, shortcut: "Alt+B", roles: ["admin", "super_admin", "manager", "cashier", "pos"] },
  { id: "page-customers", title: "Customer CRM", subtitle: "Customer directory, ledgers & loyalty", category: "pages", url: "/customers", icon: Users, roles: ["admin", "super_admin", "manager", "cashier", "pos"] },
  { id: "page-appointments", title: "Appointments Calendar", subtitle: "Bookings and schedule overview", category: "pages", url: "/appointments", icon: Calendar, roles: ["admin", "super_admin", "manager", "cashier", "pos"] },
  { id: "page-services", title: "Service Catalog", subtitle: "Hair, skin, spa & salon services", category: "pages", url: "/services", icon: Scissors, roles: ["admin", "super_admin", "manager"] },
  { id: "page-services-add", title: "Add New Service", subtitle: "Create a new salon service", category: "pages", url: "/services/add", icon: Scissors, roles: ["admin", "super_admin", "manager"] },
  { id: "page-service-cats", title: "Service Categories", subtitle: "Manage categories & master groupings", category: "pages", url: "/services/categories", icon: Tag, roles: ["admin", "super_admin", "manager"] },
  { id: "page-packages", title: "Package Directory", subtitle: "Bundled packages & promotions", category: "pages", url: "/packages", icon: Boxes, roles: ["admin", "super_admin", "manager"] },
  { id: "page-inventory", title: "Inventory & Stock", subtitle: "Central stock & outlet supplies", category: "pages", url: "/inventory", icon: Package, shortcut: "Alt+I", roles: ["admin", "super_admin", "manager"] },
  { id: "page-po", title: "Purchase Orders", subtitle: "Supplier orders & procurement", category: "pages", url: "/inventory/purchase-orders", icon: ClipboardList, roles: ["admin", "super_admin", "manager"] },
  { id: "page-units", title: "Unit Master", subtitle: "Measurement units & conversions", category: "pages", url: "/inventory/units", icon: Ruler, roles: ["admin", "super_admin", "manager"] },
  { id: "page-staff", title: "Employee Management", subtitle: "Staff profiles, biometric & roles", category: "pages", url: "/staff", icon: UserCheck, roles: ["admin", "super_admin", "manager"] },
  { id: "page-staff-add", title: "Add Employee", subtitle: "Register new staff member", category: "pages", url: "/staff/add", icon: UserCheck, roles: ["admin", "super_admin", "manager"] },
  { id: "page-attendance", title: "Attendance Tracking", subtitle: "Daily clock-in & shifts", category: "pages", url: "/attendance", icon: CalendarCheck, roles: ["admin", "super_admin", "manager"] },
  { id: "page-payroll", title: "Payroll Center", subtitle: "Salary calculation & payslips", category: "pages", url: "/payroll", icon: DollarSign, roles: ["admin", "super_admin", "manager"] },
  { id: "page-expenses", title: "Expense Control", subtitle: "Track salon expenditures & vouchers", category: "pages", url: "/expenses", icon: DollarSign, shortcut: "Alt+E", roles: ["admin", "super_admin", "manager"] },
  { id: "page-budgets", title: "Budget Management", subtitle: "Monthly budgets & expense caps", category: "pages", url: "/budgets", icon: Wallet, roles: ["admin", "super_admin", "manager"] },
  { id: "page-reports", title: "Reports & Analytics", subtitle: "Sales, revenue & performance", category: "pages", url: "/reports", icon: BarChart2, roles: ["admin", "super_admin", "manager"] },
  { id: "page-coupons", title: "Coupons Management", subtitle: "Discount codes & promos", category: "pages", url: "/coupons", icon: Tag, roles: ["admin", "super_admin", "manager", "cashier", "pos"] },
  { id: "page-vouchers", title: "Customer Vouchers", subtitle: "Gift cards & prepaid vouchers", category: "pages", url: "/vouchers", icon: Ticket, roles: ["admin", "super_admin", "manager", "cashier", "pos"] },
  { id: "page-terminals", title: "POS Terminals", subtitle: "Terminal configuration & pairing", category: "pages", url: "/pos-management/terminals", icon: Monitor, roles: ["admin", "super_admin", "manager", "cashier", "pos"] },
  { id: "page-shifts", title: "Shift History", subtitle: "POS cashier shift sessions", category: "pages", url: "/pos-management/shift-history", icon: History, roles: ["admin", "super_admin", "manager", "cashier", "pos"] },
  { id: "page-outlets", title: "Outlets Directory", subtitle: "Salon branches & locations", category: "pages", url: "/outlets", icon: Store, roles: ["admin", "super_admin"] },
  { id: "page-users", title: "App Users Management", subtitle: "User logins & permissions", category: "pages", url: "/users", icon: Shield, roles: ["admin", "super_admin"] },
  { id: "page-roles", title: "Roles & Permissions", subtitle: "Access control & policies", category: "pages", url: "/roles", icon: Lock, roles: ["admin", "super_admin"] },
  { id: "page-contracts", title: "Contracts Management", subtitle: "Staff employment contracts", category: "pages", url: "/contracts", icon: FileText, roles: ["admin", "super_admin", "manager"] },
  { id: "page-banks", title: "Bank Accounts", subtitle: "Bank master & transactions", category: "pages", url: "/bank", icon: Building2, roles: ["admin", "super_admin", "manager"] },
  { id: "page-settings", title: "Settings", subtitle: "System & business settings", category: "pages", url: "/settings", icon: Settings, roles: ["admin", "super_admin", "manager"] },
  { id: "page-notifications", title: "Notifications", subtitle: "System alerts & stock updates", category: "pages", url: "/notifications", icon: Bell, roles: ["admin", "super_admin", "manager", "cashier", "pos"] },
];

const CATEGORY_CONFIG = {
  all: { label: "All", icon: Sparkles },
  pages: { label: "Navigation", icon: Compass },
  customers: { label: "Customers", icon: Users },
  services: { label: "Services", icon: Scissors },
  products: { label: "Products", icon: Package },
  bills: { label: "Bills", icon: Receipt },
  staff: { label: "Staff", icon: UserCheck },
  packages: { label: "Packages", icon: Boxes },
  appointments: { label: "Appointments", icon: Calendar },
};

export function GlobalSearchModal() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isPosUser = user?.role === "cashier" || user?.role === "pos";

  const {
    isOpen,
    query,
    activeCategory,
    recentSearches,
    closeSearch,
    setQuery,
    setActiveCategory,
    addRecentSearch,
    clearRecentSearches,
  } = useSearchStore();

  const [loading, setLoading] = useState(false);
  const [serverResults, setServerResults] = useState({
    customers: [],
    services: [],
    products: [],
    bills: [],
    staff: [],
    packages: [],
    appointments: [],
    outlets: [],
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Filter allowed pages for the current user role
  const allowedPages = useMemo(() => {
    const userRole = user?.role || "pos";
    return APP_PAGES.filter((page) => !page.roles || page.roles.includes(userRole));
  }, [user?.role]);

  // Matching pages based on query
  const matchingPages = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return allowedPages
      .filter((page) => page.title.toLowerCase().includes(q) || page.subtitle.toLowerCase().includes(q) || page.url.toLowerCase().includes(q))
      .slice(0, 5)
      .map((page) => ({
        id: page.id,
        title: page.title,
        subtitle: page.subtitle,
        category: "pages",
        badge: page.shortcut || "Page",
        badgeColor: "sky",
        url: page.url,
      }));
  }, [query, allowedPages]);

  // Debounced API search
  useEffect(() => {
    if (!isOpen) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setServerResults({
        customers: [],
        services: [],
        products: [],
        bills: [],
        staff: [],
        packages: [],
        appointments: [],
        outlets: [],
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const typeParam = activeCategory === "all" || activeCategory === "pages" ? "all" : activeCategory;
        const res = await globalSearchAPI({
          q: trimmed,
          type: typeParam,
          limit: 6,
        });
        if (res && res.results) {
          setServerResults(res.results);
        }
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, activeCategory, isOpen]);

  // Grouped results map
  const allCategorizedItems = useMemo(() => {
    const categories = [];

    // Pages
    if (activeCategory === "all" || activeCategory === "pages") {
      if (matchingPages.length > 0) {
        categories.push({
          categoryKey: "pages",
          title: "Pages & Quick Actions",
          icon: Compass,
          items: matchingPages,
        });
      }
    }

    // Server results
    const keys = [
      { key: "customers", title: "Customers", icon: Users },
      { key: "services", title: "Services", icon: Scissors },
      { key: "products", title: "Products & Stock", icon: Package },
      { key: "bills", title: "Bills & Invoices", icon: Receipt },
      { key: "staff", title: "Staff Members", icon: UserCheck, hide: isPosUser },
      { key: "packages", title: "Packages", icon: Boxes },
      { key: "appointments", title: "Appointments", icon: Calendar },
      { key: "outlets", title: "Outlets", icon: Store, hide: isPosUser },
    ];

    keys.forEach(({ key, title, icon, hide }) => {
      if (hide) return;
      if (activeCategory === "all" || activeCategory === key) {
        const items = serverResults[key] || [];
        if (items.length > 0) {
          categories.push({
            categoryKey: key,
            title,
            icon,
            items,
          });
        }
      }
    });

    return categories;
  }, [activeCategory, matchingPages, serverResults, isPosUser]);

  // Flattened items for keyboard indexing
  const flattenedItems = useMemo(() => {
    return allCategorizedItems.flatMap((cat) => cat.items);
  }, [allCategorizedItems]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [flattenedItems.length, query, activeCategory]);

  const handleSelect = (item) => {
    if (!item) return;
    addRecentSearch(item);
    closeSearch();
    navigate(item.url);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeSearch();
      return;
    }

    if (flattenedItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flattenedItems.length);
      scrollItemIntoView((selectedIndex + 1) % flattenedItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flattenedItems.length) % flattenedItems.length);
      scrollItemIntoView((selectedIndex - 1 + flattenedItems.length) % flattenedItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = flattenedItems[selectedIndex];
      if (current) {
        handleSelect(current);
      }
    }
  };

  const scrollItemIntoView = (index) => {
    setTimeout(() => {
      const el = listRef.current?.querySelector(`[data-index="${index}"]`);
      if (el) {
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }, 10);
  };

  if (!isOpen) return null;

  const isQueryEmpty = !query.trim();

  const getCategoryIcon = (category) => {
    switch (category) {
      case "customers":
        return Users;
      case "services":
        return Scissors;
      case "products":
        return Package;
      case "bills":
        return Receipt;
      case "staff":
        return UserCheck;
      case "packages":
        return Boxes;
      case "appointments":
        return Calendar;
      case "outlets":
        return Store;
      default:
        return Compass;
    }
  };

  let globalIndexCounter = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-12 md:p-6 md:pt-20"
      role="dialog"
      aria-modal="true"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-navy-950/60 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={closeSearch}
      />

      {/* Command Palette Card */}
      <div
        className="relative flex flex-col w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-2xl backdrop-blur-2xl ring-1 ring-black/5 animate-premium-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Search Bar */}
        <div className="relative flex items-center border-b border-slate-100 px-5 py-4">
          <Search className="h-5 w-5 text-gold-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers, bills, services, staff, pages..."
            className="ml-3 flex-1 bg-transparent text-base font-medium text-slate-800 placeholder-slate-400 outline-none"
          />

          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-gold-500 shrink-0 mr-2" />
          )}

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="mr-2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <kbd className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
            ESC
          </kbd>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 bg-slate-50/60 px-4 py-2 text-xs no-scrollbar">
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
            if (isPosUser && (key === "staff" || key === "outlets")) return null;
            const Icon = config.icon;
            const isActive = activeCategory === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveCategory(key)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 font-medium transition-all ${
                  isActive
                    ? "bg-gold-500 text-navy-950 font-semibold shadow-sm"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {config.label}
              </button>
            );
          })}
        </div>

        {/* Body Area */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-3 py-3 scroll-smooth max-h-[55vh]"
        >
          {/* 1. Empty Query State: Recent Searches & Quick Links */}
          {isQueryEmpty && (
            <div className="space-y-5 px-2 py-1">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-2 pb-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      Recent Searches
                    </span>
                    <button
                      type="button"
                      onClick={clearRecentSearches}
                      className="text-xs text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Clear
                    </button>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((item, idx) => {
                      const Icon = getCategoryIcon(item.category);
                      return (
                        <div
                          key={`recent-${idx}`}
                          onClick={() => handleSelect(item)}
                          className="group flex cursor-pointer items-center justify-between rounded-2xl px-3 py-2.5 transition-all hover:bg-gold-50/60"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-gold-100 group-hover:text-gold-700 transition-colors">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="truncate">
                              <p className="text-sm font-medium text-slate-800 group-hover:text-gold-900 transition-colors">
                                {item.title}
                              </p>
                              {item.subtitle && (
                                <p className="text-xs text-slate-400 truncate">
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider group-hover:text-gold-600">
                            {item.category}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Navigation Pages */}
              <div>
                <span className="flex items-center gap-1.5 px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <Compass className="h-3.5 w-3.5 text-slate-400" />
                  Quick Actions & Shortcuts
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {allowedPages.slice(0, 8).map((page) => {
                    const Icon = page.icon;
                    return (
                      <button
                        key={page.id}
                        type="button"
                        onClick={() => handleSelect(page)}
                        className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 p-3 text-left transition-all hover:border-gold-300 hover:bg-gold-50/40"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-100 text-slate-600 group-hover:text-gold-700 shadow-sm transition-colors">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-semibold text-slate-800 group-hover:text-gold-950 transition-colors">
                              {page.title}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {page.subtitle}
                            </p>
                          </div>
                        </div>
                        {page.shortcut && (
                          <kbd className="ml-2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 shrink-0">
                            {page.shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 2. Active Query Results */}
          {!isQueryEmpty && (
            <div className="space-y-4">
              {allCategorizedItems.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <Search className="h-6 w-6" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-slate-800">
                    No results found for &ldquo;{query}&rdquo;
                  </h3>
                  <p className="mt-1 text-xs text-slate-400 max-w-sm">
                    Try searching for a customer phone number, bill #, service name, or staff member.
                  </p>
                </div>
              )}

              {allCategorizedItems.map((group) => {
                return (
                  <div key={group.categoryKey} className="space-y-1">
                    <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <group.icon className="h-3.5 w-3.5 text-slate-400" />
                      {group.title}
                      <span className="ml-auto text-[11px] font-normal lowercase text-slate-400">
                        {group.items.length} {group.items.length === 1 ? "match" : "matches"}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const itemIndex = globalIndexCounter++;
                        const isSelected = selectedIndex === itemIndex;
                        const Icon = getCategoryIcon(item.category);

                        return (
                          <div
                            key={`${item.category}-${item.id}`}
                            data-index={itemIndex}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setSelectedIndex(itemIndex)}
                            className={`group flex cursor-pointer items-center justify-between rounded-2xl px-3 py-2.5 transition-all ${
                              isSelected
                                ? "bg-gold-50/90 text-navy-900 ring-1 ring-gold-300"
                                : "hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                                  isSelected
                                    ? "bg-gold-500 text-navy-950 font-bold"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                <Icon className="h-4 w-4" />
                              </div>

                              <div className="truncate">
                                <div className="flex items-center gap-2">
                                  <p
                                    className={`text-sm font-semibold truncate ${
                                      isSelected ? "text-navy-950" : "text-slate-800"
                                    }`}
                                  >
                                    {item.title}
                                  </p>
                                  {item.badge && (
                                    <span
                                      style={
                                        item.badgeColor?.startsWith("#")
                                          ? {
                                              color: item.badgeColor,
                                              backgroundColor: `${item.badgeColor}18`,
                                              borderColor: `${item.badgeColor}40`,
                                            }
                                          : undefined
                                      }
                                      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                                        !item.badgeColor?.startsWith("#")
                                          ? item.badgeColor === "emerald"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : item.badgeColor === "amber" || item.badgeColor === "gold"
                                            ? "bg-gold-50 text-gold-800 border-gold-300"
                                            : item.badgeColor === "indigo"
                                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                            : "bg-slate-100 text-slate-600 border-slate-200"
                                          : ""
                                      }`}
                                    >
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                                {item.subtitle && (
                                  <p className="text-xs text-slate-500 truncate mt-0.5">
                                    {item.subtitle}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              {isSelected ? (
                                <span className="flex items-center gap-1 text-[11px] font-semibold text-gold-700">
                                  Jump <CornerDownLeft className="h-3 w-3" />
                                </span>
                              ) : (
                                <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info & shortcut guide */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-2.5 text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold shadow-2xs">
                ↑
              </kbd>
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold shadow-2xs">
                ↓
              </kbd>
              Navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold shadow-2xs">
                ↵
              </kbd>
              Select
            </span>
          </div>

          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold shadow-2xs">
              ESC
            </kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  );
}
