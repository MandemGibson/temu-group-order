import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Layers, Package, Sparkles, HelpCircle, ShieldCheck } from "lucide-react";

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const { user, token } = useAuthStore();

  const isLeader =
    user?.role === "leader" ||
    user?.role === "admin" ||
    user?.role === "super_admin";
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const isActive = (path: string) => {
    if (path === "/" && location.pathname !== "/") return false;
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { label: "Explore", path: "/", icon: Layers },
    ...(token
      ? [{ label: "Orders", path: "/orders", icon: Package }]
      : [{ label: "Guide", path: "/how-it-works", icon: HelpCircle }]),
    ...(isLeader
      ? [{ label: "Leader", path: "/leader", icon: Sparkles }]
      : [{ label: "Lead", path: "/onboarding", icon: Sparkles }]),
    ...(isAdmin ? [{ label: "Admin", path: "/admin", icon: ShieldCheck }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 md:hidden pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                active ? "text-orange-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-all ${
                  active ? "bg-orange-50 scale-105" : ""
                }`}
              >
                <item.icon className="w-5 h-5" />
              </div>
              <span
                className={`text-[10px] font-semibold mt-0.5 tracking-tight ${
                  active ? "text-orange-600 font-bold" : "text-slate-500"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
