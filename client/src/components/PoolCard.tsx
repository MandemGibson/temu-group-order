import React from "react";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatGhs } from "@/lib/utils";
import {
  Users,
  Clock,
  ShieldCheck,
  Star,
  ChevronRight,
  TrendingUp,
  Sparkles,
  ShoppingBag,
} from "lucide-react";

export interface PoolData {
  id: string;
  title: string;
  category?: string;
  status: "open" | "funded" | "ordered" | "shipped" | "delivered" | "dead";
  targetPesewas: number;
  minPerPersonPesewas: number;
  joinFeePesewas: number;
  deadlineAt: string;
  itemCostDeadlineHours: number;
  leader: {
    id: string;
    name?: string;
    phone: string;
    averageRating?: number;
    completedPoolsCount?: number;
    leaderOnboardingStatus?: string;
  };
  joins?: Array<{
    id: string;
    contributionPesewas: number;
  }>;
  totalContributedPesewas?: number;
  participantCount?: number;
}

interface PoolCardProps {
  pool: PoolData;
  onSelect: (pool: PoolData) => void;
}

// Category visual gradient banners
const getCategoryGradient = (cat?: string) => {
  switch (cat?.toLowerCase()) {
    case "electronics":
      return "from-slate-900 via-blue-900 to-slate-900";
    case "fashion":
      return "from-[#fb5814] via-rose-600 to-[#e64a19]";
    case "home & kitchen":
      return "from-emerald-900 via-teal-900 to-slate-900";
    case "beauty":
      return "from-pink-600 via-purple-600 to-slate-900";
    default:
      return "from-slate-900 via-slate-800 to-slate-950";
  }
};

export const PoolCard: React.FC<PoolCardProps> = ({ pool, onSelect }) => {
  const currentTotal =
    pool.totalContributedPesewas ??
    (pool.joins?.reduce((sum, j) => sum + j.contributionPesewas, 0) || 0);

  const participantCount = pool.participantCount ?? pool.joins?.length ?? 0;
  const progressPercent = Math.min(
    100,
    Math.round((currentTotal / pool.targetPesewas) * 100)
  );

  const deadline = new Date(pool.deadlineAt);
  const isExpired = deadline.getTime() < Date.now();
  const hoursLeft = Math.max(
    0,
    Math.round((deadline.getTime() - Date.now()) / (1000 * 60 * 60))
  );

  const bannerGradient = getCategoryGradient(pool.category);

  return (
    <Card className="card-hover-effect group relative flex flex-col justify-between overflow-hidden border border-slate-200/80 bg-white rounded-3xl shadow-xs hover:border-[#fb5814]/40">
      {/* Top Banner Image Placeholder */}
      <div className={`relative h-28 w-full bg-gradient-to-r ${bannerGradient} p-4 flex flex-col justify-between overflow-hidden`}>
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center justify-between z-10">
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white border border-white/20 uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-orange-300" />
            {pool.category || "Others"}
          </span>
          <StatusBadge status={pool.status} />
        </div>

        {/* Floating Participants Stack pill */}
        <div className="flex items-center justify-between text-white z-10">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
            <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />
            <span>Target: {formatGhs(pool.targetPesewas)}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded-md backdrop-blur-xs border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
            <span>{hoursLeft}h left</span>
          </div>
        </div>
      </div>

      {/* Card Main Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Title */}
          <h3 className="font-black text-slate-900 text-base leading-snug line-clamp-2 group-hover:text-[#fb5814] transition-colors mb-3">
            {pool.title}
          </h3>

          {/* Leader Profile Chip */}
          <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-slate-50 border border-slate-100/80 mb-4">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-[#fb5814] text-white font-extrabold text-xs shadow-xs">
              {pool.leader.name ? pool.leader.name[0] : "L"}
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] border-2 border-white">
                ✓
              </span>
            </div>

            <div className="flex-1 truncate">
              <div className="flex items-center gap-1 font-bold text-slate-900 text-xs truncate">
                <span className="truncate">{pool.leader.name || pool.leader.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold">
                <span className="flex items-center gap-0.5 text-amber-600">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {pool.leader.averageRating ? pool.leader.averageRating.toFixed(1) : "4.9"}
                </span>
                <span>•</span>
                <span>{pool.leader.completedPoolsCount || 32} pools led</span>
              </div>
            </div>
          </div>

          {/* Minimum Cart Floor Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-[#fb5814]" />
                GH₵ 350 Floor Goal
              </span>
              <span className="font-black text-[#e64a19]">
                {progressPercent}%
              </span>
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#fb5814] to-orange-400 transition-all duration-500 glow-progress"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>{formatGhs(currentTotal)} raised</span>
              <span>{participantCount} buyers joined</span>
            </div>
          </div>
        </div>

        {/* Card Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider block">
              Min / Buyer
            </span>
            <div className="font-black text-[#e64a19] text-base">
              {formatGhs(pool.minPerPersonPesewas)}
            </div>
          </div>

          <Button
            size="md"
            onClick={() => onSelect(pool)}
            className="h-10 px-4 text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 group-hover:scale-[1.02] transition-transform"
          >
            Join Pool <ChevronRight className="h-4 w-4 ml-0.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
