import React from "react";
import { Button } from "@/components/ui/button";
import { TEMU_MIN_ORDER_GHS } from "@/config";
import {
  Sparkles,
  ShoppingBag,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

interface HeroSectionProps {
  onBrowsePools: () => void;
  onCreatePool: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onBrowsePools,
  onCreatePool,
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-950 text-white p-6 sm:p-10 lg:p-12 mb-10 shadow-2xl border border-slate-800/80 transition-all duration-300">
      {/* Dynamic Background Mesh Gradients */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#fb5814]/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-3xl space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#fb5814]/20 border border-[#fb5814]/40 text-[#fb5814] text-xs font-extrabold tracking-wide uppercase backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-[#fb5814] pulse-dot" />
          <span>Fides — Temu Ghana Group Buying Platform</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-none">
          Split Shipping. <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#fb5814] via-orange-400 to-amber-300">
            Reach GH₵ {TEMU_MIN_ORDER_GHS} Floor.
          </span>
        </h1>

        <p className="text-slate-300 text-sm sm:text-base max-w-2xl font-medium leading-relaxed">
          Combine small Temu cart orders with verified group leaders in Accra,
          Kumasi, and Tema. Unlock direct Temu international shipping without
          paying heavy solo shipping fees.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center gap-3.5 pt-2">
          <Button
            size="lg"
            variant="default"
            onClick={onBrowsePools}
            className="h-12 px-7 rounded-2xl font-bold shadow-xl shadow-orange-500/30 hover:scale-[1.02] transition-transform"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Browse Active Pools
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={onCreatePool}
            className="h-12 px-7 rounded-2xl font-bold bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
          >
            Start New Group Order
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Feature Badges Grid */}
        <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-800/80 max-w-xl">
          <div className="space-y-0.5">
            <p className="text-lg sm:text-xl font-extrabold text-white">
              GH₵ {TEMU_MIN_ORDER_GHS}.00
            </p>
            <p className="text-[11px] font-semibold text-slate-400">
              Temu Cart Floor
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-lg sm:text-xl font-extrabold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Escrow
            </p>
            <p className="text-[11px] font-semibold text-slate-400">
              100% Buyer Security
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-lg sm:text-xl font-extrabold text-[#fb5814]">
              24-48 Hours
            </p>
            <p className="text-[11px] font-semibold text-slate-400">
              SpeedAF Dispatch
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
