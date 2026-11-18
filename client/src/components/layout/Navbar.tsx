import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { formatGhs } from "@/lib/utils";
import { api } from "@/api/client";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import {
  ShoppingBag,
  User as UserIcon,
  LogOut,
  Wallet,
  Plus,
  Search,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  HelpCircle,
  Package,
  Layers,
  Bell,
} from "lucide-react";

interface NavbarProps {
  onOpenAuth: () => void;
  onOpenCreatePool: () => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAuth,
  onOpenCreatePool,
  searchQuery,
  setSearchQuery,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, creditBalancePesewas, logout, token } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isLeader =
    user?.role === "leader" ||
    user?.role === "admin" ||
    user?.role === "super_admin";
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const fetchUnreadCount = async () => {
    if (!token) return;
    try {
      const res = await api.get("/notifications");
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchUnreadCount();
  }, [token]);

  const navLinks = [
    { label: "Explore Pools", path: "/", icon: Layers },
    { label: "How It Works", path: "/how-it-works", icon: HelpCircle },
    ...(token ? [{ label: "My Orders", path: "/orders", icon: Package }] : []),
    ...(isLeader ? [{ label: "Leader Hub", path: "/leader", icon: Sparkles }] : []),
    ...(isAdmin ? [{ label: "Admin", path: "/admin", icon: ShieldCheck }] : []),
  ];

  const isActive = (path: string) => {
    if (path === "/" && location.pathname !== "/") return false;
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white shadow-md shadow-orange-600/20 group-hover:scale-105 transition-all">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-slate-900 font-sans">
                  fides
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200/60 uppercase tracking-wider">
                  Ghana
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium -mt-1 hidden sm:block">
                Temu Group Buying
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Search Bar (When on home view) */}
        {setSearchQuery !== undefined && location.pathname === "/" && (
          <div className="hidden lg:flex items-center flex-1 max-w-xs mx-6">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search items or leaders..."
                value={searchQuery || ""}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>
          </div>
        )}

        {/* Right Action Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Become Leader CTA (if not leader) */}
          {!isLeader && (
            <Link
              to="/onboarding"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              Lead a Pool
            </Link>
          )}

          {/* Create Pool Button (If verified leader) */}
          {isLeader && (
            <button
              onClick={onOpenCreatePool}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs transition-all shadow-sm shadow-orange-600/20"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Launch Pool</span>
            </button>
          )}

          {/* Credit Wallet Badge */}
          {token && (
            <Link
              to="/orders"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-bold hover:bg-emerald-100/60 transition-colors"
              title="Platform Reusable Buyer Credit"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              <span>{formatGhs(creditBalancePesewas)}</span>
            </Link>
          )}

          {/* Notifications Dropdown */}
          {token && (
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-600 text-white text-[10px] font-black border-2 border-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              <NotificationDropdown
                isOpen={notifOpen}
                onClose={() => setNotifOpen(false)}
                unreadCount={unreadCount}
                onRefreshUnread={fetchUnreadCount}
              />
            </div>
          )}

          {/* User Auth / Profile */}
          {!token ? (
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold tracking-wide transition-all shadow-sm"
            >
              Sign In
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                  {user?.name ? user.name.slice(0, 2) : "GH"}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {/* Profile Dropdown */}
              {profileOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setProfileOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-slate-200/80 p-2 z-40 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {user?.name || "Shopper"}
                      </p>
                      <p className="text-xs text-slate-500 truncate font-mono">
                        {user?.phone}
                      </p>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/orders"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <Package className="w-4 h-4 text-slate-400" />
                        My Orders & Delivery
                      </Link>
                      {isLeader && (
                        <Link
                          to="/leader"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <Sparkles className="w-4 h-4 text-orange-500" />
                          Leader Dashboard
                        </Link>
                      )}
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4 text-blue-500" />
                          Admin Console
                        </Link>
                      )}
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          logout();
                          navigate("/");
                        }}
                        className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
