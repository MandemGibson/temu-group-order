import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatGhs } from "@/lib/utils";
import { api } from "@/api/client";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import {
  ShoppingBag,
  User as UserIcon,
  LogOut,
  Wallet,
  ShieldCheck,
  Plus,
  Search,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  Bell,
} from "lucide-react";

export type NavTab = "pools" | "howitworks" | "become-leader" | "orders" | "leader" | "admin";

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenAuth: () => void;
  onOpenCreatePool: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAuth,
  onOpenCreatePool,
  searchQuery,
  setSearchQuery,
}) => {
  const { user, creditBalancePesewas, logout, token } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const isLeader = user?.role === "leader" || user?.role === "admin" || user?.role === "super_admin";
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const fetchUnreadCount = async () => {
    if (!token) return;
    try {
      const res = await api.get("/notifications");
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      // Handled
    }
  };

  useEffect(() => {
    fetchUnreadCount();
  }, [token]);

  const handleNavClick = (tab: NavTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-nav border-b border-slate-200/80 shadow-xs transition-all duration-300">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-6">
          <div
            onClick={() => handleNavClick("pools")}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fb5814] text-white shadow-md shadow-orange-500/25 group-hover:scale-105 group-hover:rotate-1 transition-all duration-200">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xl tracking-tight text-slate-900">
                  Fides
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-100 text-[#e64a19] uppercase tracking-wider border border-orange-200/60">
                  Ghana 🇬🇭
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold hidden sm:block">
                Split shipping costs together
              </p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/70 p-1 rounded-2xl border border-slate-200/60">
            <button
              onClick={() => handleNavClick("pools")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === "pools"
                  ? "bg-white text-[#fb5814] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Browse Pools
            </button>

            <button
              onClick={() => handleNavClick("howitworks")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === "howitworks"
                  ? "bg-white text-[#fb5814] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              How It Works
            </button>

            {!isLeader && (
              <button
                onClick={() => handleNavClick("become-leader")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  activeTab === "become-leader"
                    ? "bg-white text-[#fb5814] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Become a Leader
              </button>
            )}

            {user && (
              <button
                onClick={() => handleNavClick("orders")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  activeTab === "orders"
                    ? "bg-white text-[#fb5814] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                My Orders & Credit
              </button>
            )}

            {isLeader && (
              <button
                onClick={() => handleNavClick("leader")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  activeTab === "leader"
                    ? "bg-orange-500 text-white shadow-sm shadow-orange-500/20"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Leader Dashboard
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => handleNavClick("admin")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  activeTab === "admin"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Admin Control
              </button>
            )}
          </nav>
        </div>

        {/* Right Actions & Mobile Toggle */}
        <div className="flex items-center gap-3">
          {/* Search Input (Desktop) */}
          <div className="relative hidden xl:block w-56">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search pools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#fb5814] transition-all"
            />
          </div>

          {/* User Logged In Actions */}
          {user ? (
            <>
              {/* Credit Balance Pill */}
              <div
                onClick={() => handleNavClick("orders")}
                className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200/80 text-[#e64a19] text-xs font-bold hover:bg-orange-100 transition-all shadow-xs"
                title="Your available platform credit balance"
              >
                <Wallet className="h-4 w-4" />
                <span>{formatGhs(creditBalancePesewas)}</span>
              </div>

              {/* Notification Bell Button & Popover Container */}
              <div className="relative">
                <button
                  onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                  className="relative p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#fb5814] text-white text-[10px] font-black border-2 border-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                <NotificationDropdown
                  isOpen={notifDropdownOpen}
                  onClose={() => setNotifDropdownOpen(false)}
                  unreadCount={unreadCount}
                  onRefreshUnread={fetchUnreadCount}
                />
              </div>

              {isLeader && (
                <Button size="sm" onClick={onOpenCreatePool} className="h-9 px-3.5 text-xs font-bold rounded-xl shadow-md shadow-orange-500/20">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Create Pool</span>
                </Button>
              )}

              {/* Profile Avatar / Logout */}
              <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                <div className="flex flex-col text-right hidden xl:block">
                  <span className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                    {user.name || user.phone}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 capitalize">
                    {user.role}
                  </span>
                </div>
                <Button variant="ghost" size="icon" onClick={logout} title="Sign Out" className="h-9 w-9 rounded-xl hover:bg-red-50 hover:text-red-600">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <Button onClick={onOpenAuth} size="sm" className="h-9 px-4 text-xs font-bold rounded-xl shadow-md shadow-orange-500/20">
              <UserIcon className="h-4 w-4" />
              Sign In
            </Button>
          )}

          {/* Mobile Menu Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-xl px-4 py-4 space-y-2 shadow-xl animate-in slide-in-from-top duration-200">
          <div className="pb-2">
            <input
              type="text"
              placeholder="Search pools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#fb5814]"
            />
          </div>

          <button
            onClick={() => handleNavClick("pools")}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "pools" ? "bg-orange-50 text-[#e64a19]" : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span>Browse Pools</span>
            <ChevronRight className="w-4 h-4 opacity-50" />
          </button>

          <button
            onClick={() => handleNavClick("howitworks")}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "howitworks" ? "bg-orange-50 text-[#e64a19]" : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span>How It Works</span>
            <ChevronRight className="w-4 h-4 opacity-50" />
          </button>

          {!isLeader && (
            <button
              onClick={() => handleNavClick("become-leader")}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === "become-leader" ? "bg-orange-50 text-[#e64a19]" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span>Become a Leader</span>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>
          )}

          {user && (
            <button
              onClick={() => handleNavClick("orders")}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === "orders" ? "bg-orange-50 text-[#e64a19]" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span>My Orders & Credit ({formatGhs(creditBalancePesewas)})</span>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>
          )}

          {isLeader && (
            <button
              onClick={() => handleNavClick("leader")}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === "leader" ? "bg-orange-500 text-white" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span>Leader Dashboard</span>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => handleNavClick("admin")}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === "admin" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span>Admin Control</span>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>
          )}
        </div>
      )}
    </header>
  );
};
