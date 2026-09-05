import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Navbar } from "../components/navigation/Navbar";
import { Sidebar } from "../components/navigation/Sidebar";
import { ToastContainer } from "../components/ui/ToastContainer";
import { GlobalSearchModal } from "../components/search/GlobalSearchModal";
import { useAuthStore } from "../stores/authStore";
import { useSearchStore } from "../stores/searchStore";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);
  const isPosUser = user?.role === "cashier" || user?.role === "pos";
  const openSearch = useSearchStore((state) => state.openSearch);
  const toggleSearch = useSearchStore((state) => state.toggleSearch);

  // Global Keyboard shortcuts: Ctrl+K (search), Ctrl+B (sidebar), Alt+P (POS), Alt+B (Bills), Alt+I (Inventory), Alt+E (Expenses)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger navigation shortcuts if user is typing in an editable field (except Ctrl shortcuts)
      const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
      
      // Ctrl+K / Cmd+K to toggle Global Search anywhere
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleSearch();
        return;
      }

      // Pressing "/" when not in an editable field to open search
      if (e.key === "/" && !isInput) {
        e.preventDefault();
        openSearch();
        return;
      }

      if (e.ctrlKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSidebarCollapsed((prev) => !prev);
        return;
      }

      if (e.altKey && !isInput) {
        const key = e.key.toLowerCase();
        if (key === "p") {
          e.preventDefault();
          navigate("/pos");
        } else if (key === "b") {
          e.preventDefault();
          navigate("/pos/bills");
        } else if (key === "i" && !isPosUser) {
          e.preventDefault();
          navigate("/inventory");
        } else if (key === "e" && !isPosUser) {
          e.preventDefault();
          navigate("/expenses");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, isPosUser, openSearch, toggleSearch]);

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex min-h-screen flex-1 flex-col min-w-0">
        <Navbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 py-4 md:px-6 md:py-5">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
      <GlobalSearchModal />
    </div>
  );
}
