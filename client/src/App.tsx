import React, { useEffect, useState } from "react";
import { Navbar, NavTab } from "@/components/Navbar";
import { PoolCard, PoolData } from "@/components/PoolCard";
import { PoolDetailModal } from "@/components/PoolDetailModal";
import { JoinPoolModal } from "@/components/JoinPoolModal";
import { CreatePoolModal } from "@/components/CreatePoolModal";
import { AuthModal } from "@/components/AuthModal";
import { HeroSection } from "@/components/HeroSection";
import { HowItWorksView } from "@/views/HowItWorksView";
import { LeaderOnboardingView } from "@/views/LeaderOnboardingView";
import { BuyerOrdersView } from "@/views/BuyerOrdersView";
import { LeaderDashboardView } from "@/views/LeaderDashboardView";
import { AdminDashboardView } from "@/views/AdminDashboardView";
import { api } from "@/api/client";
import { useAuthStore } from "@/store/useAuthStore";

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("pools");
  const [pools, setPools] = useState<PoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedDetailPool, setSelectedDetailPool] = useState<PoolData | null>(null);
  const [selectedJoinPool, setSelectedJoinPool] = useState<PoolData | null>(null);
  const [isCreatePoolOpen, setIsCreatePoolOpen] = useState(false);

  const { token, user, setCreditBalance } = useAuthStore();

  const fetchPools = async () => {
    setLoading(true);
    try {
      const res = await api.get("/pools");
      setPools(res.data.pools || []);
    } catch (err) {
      // Handled by api interceptor
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCredit = async () => {
    if (!token) return;
    try {
      const res = await api.get("/me/credit");
      setCreditBalance(res.data.creditBalancePesewas || 0);
    } catch (err) {
      // Handled
    }
  };

  useEffect(() => {
    fetchPools();
    fetchUserCredit();
  }, [token]);

  const categories = [
    { id: "all", label: "All Categories" },
    { id: "Electronics", label: "Electronics & Tech" },
    { id: "Fashion", label: "Fashion & Apparel" },
    { id: "Home & Kitchen", label: "Home & Kitchenware" },
    { id: "Beauty", label: "Beauty" },
    { id: "Others", label: "Others (Uncategorized)" },
  ];

  const filteredPools = pools.filter((p) => {
    let matchesCategory = false;
    if (categoryFilter === "all") {
      matchesCategory = true;
    } else if (categoryFilter === "Others") {
      matchesCategory = !p.category || p.category.toLowerCase() === "others";
    } else {
      matchesCategory = !!(p.category && p.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    const matchesSearch =
      searchQuery.trim() === "" ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.leader.name?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenCreatePool={() => {
          if (!token) setIsAuthOpen(true);
          else setIsCreatePoolOpen(true);
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "pools" && (
          <div className="space-y-8">
            {/* Interactive Hero Section */}
            <HeroSection
              onBrowsePools={() => {
                const el = document.getElementById("pools-grid-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              onCreatePool={() => {
                if (!token) setIsAuthOpen(true);
                else setIsCreatePoolOpen(true);
              }}
            />

            {/* Category Filter Pills & Counter */}
            <div id="pools-grid-section" className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`h-10 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                      categoryFilter === cat.id
                        ? "bg-[#fb5814] text-white shadow-sm shadow-orange-500/20"
                        : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="text-xs font-medium text-slate-500">
                Showing <span className="font-bold text-slate-900">{filteredPools.length}</span> active pools
              </div>
            </div>

            {/* Pool Cards Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-64 rounded-2xl bg-slate-200/60 animate-pulse" />
                ))}
              </div>
            ) : filteredPools.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500 bg-white">
                <p className="font-semibold text-slate-700">No active group order pools found.</p>
                <p className="text-xs text-slate-400 mt-1">Try selecting another category or create a new pool.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPools.map((pool) => (
                  <PoolCard
                    key={pool.id}
                    pool={pool}
                    onSelect={(p) => setSelectedDetailPool(p)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "howitworks" && (
          <HowItWorksView
            onBrowsePools={() => setActiveTab("pools")}
            onBecomeLeader={() => setActiveTab("become-leader")}
          />
        )}

        {activeTab === "become-leader" && <LeaderOnboardingView />}
        {activeTab === "orders" && <BuyerOrdersView />}
        {activeTab === "leader" && <LeaderDashboardView />}
        {activeTab === "admin" && <AdminDashboardView />}
      </main>

      {/* Global Modals */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      <PoolDetailModal
        pool={selectedDetailPool}
        isOpen={!!selectedDetailPool}
        onClose={() => setSelectedDetailPool(null)}
        onOpenJoin={(p) => {
          if (!token) {
            setIsAuthOpen(true);
          } else {
            setSelectedJoinPool(p);
          }
        }}
      />

      <JoinPoolModal
        pool={selectedJoinPool}
        isOpen={!!selectedJoinPool}
        onClose={() => setSelectedJoinPool(null)}
        onSuccess={fetchPools}
      />

      <CreatePoolModal
        isOpen={isCreatePoolOpen}
        onClose={() => setIsCreatePoolOpen(false)}
        onSuccess={fetchPools}
      />
    </div>
  );
}
