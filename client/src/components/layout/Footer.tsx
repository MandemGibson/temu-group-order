import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Truck, RefreshCw, ShoppingBag } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 pb-20 md:pb-12 pt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Value Proposition Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-12 border-b border-slate-800">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-slate-800 text-orange-400 shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm mb-1">
                Meet Temu GH₵ 350 Minimums
              </h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                Pool orders with verified leaders in Accra, Kumasi & Tema so you never have to buy more than you need.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-slate-800 text-emerald-400 shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm mb-1">
                100% Platform Buyer Guarantee
              </h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                If a pool fails to fund, 100% of your join fee converts immediately to reusable platform credit.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-slate-800 text-blue-400 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm mb-1">
                SpeedAF Ghana Tracking
              </h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                Leaders provide real SpeedAF waybills and tracking numbers the moment Temu ships from Guangzhou.
              </p>
            </div>
          </div>
        </div>

        {/* Brand & Links */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-orange-600 flex items-center justify-center text-white font-black text-xs">
                F
              </div>
              <span className="text-white font-bold text-sm">fides</span>
            </div>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span>Ghana's Temu Group Buying Marketplace</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-slate-400 font-medium">
            <Link to="/" className="hover:text-white transition-colors">
              Explore Pools
            </Link>
            <Link to="/how-it-works" className="hover:text-white transition-colors">
              How It Works
            </Link>
            <Link to="/onboarding" className="hover:text-white transition-colors">
              Become a Leader
            </Link>
            <span className="text-slate-600">|</span>
            <span className="text-slate-500">
              MoMo: MTN • Telecel • AT
            </span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800/60 text-center text-[11px] text-slate-500">
          © {new Date().getFullYear()} Fides Ghana. All rights reserved. Built for community group orders in Ghana.
        </div>
      </div>
    </footer>
  );
};
