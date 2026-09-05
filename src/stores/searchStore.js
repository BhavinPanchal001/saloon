import { create } from "zustand";

const RECENT_SEARCHES_KEY = "glowy_recent_searches";

const loadRecentSearches = () => {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveRecentSearches = (searches) => {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches.slice(0, 8)));
  } catch {
    // Ignore localStorage write failures
  }
};

export const useSearchStore = create((set, get) => ({
  isOpen: false,
  query: "",
  activeCategory: "all",
  recentSearches: loadRecentSearches(),

  openSearch: (initialQuery = "") =>
    set({
      isOpen: true,
      query: initialQuery,
    }),

  closeSearch: () =>
    set({
      isOpen: false,
      query: "",
    }),

  toggleSearch: () =>
    set((state) => ({
      isOpen: !state.isOpen,
      query: state.isOpen ? "" : state.query,
    })),

  setQuery: (query) => set({ query }),

  setActiveCategory: (activeCategory) => set({ activeCategory }),

  addRecentSearch: (item) => {
    if (!item || !item.title) return;
    const current = get().recentSearches;
    const filtered = current.filter((r) => !(r.id === item.id && r.category === item.category));
    const updated = [
      {
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        category: item.category,
        url: item.url,
        badge: item.badge,
        timestamp: Date.now(),
      },
      ...filtered,
    ].slice(0, 8);

    saveRecentSearches(updated);
    set({ recentSearches: updated });
  },

  clearRecentSearches: () => {
    saveRecentSearches([]);
    set({ recentSearches: [] });
  },
}));
