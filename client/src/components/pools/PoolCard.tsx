import React from "react";
import { Link } from "react-router-dom";
import { formatGhs } from "@/lib/utils";
import {
  Users,
  Clock,
  ShieldCheck,
  Star,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export interface PoolData {
  id: string;
  title: string;
  category?: string;
  status: "open" | "funded" | "ordered" | "shipped" | "delivered" | "dead";
  targetPesewas: number;
  minPerPersonPesewas: number;
  joinFeePesewas: number;
  maxParticipants?: number;
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
    buyer?: { name?: string };
    items?: Array<{
      itemDescription: string;
      quantity: number;
      estimatedCostGhs?: number;
    }>;
  }>;
  totalContributedPesewas?: number;
  participantCount?: number;
}

interface PoolCardProps {
  pool: PoolData;
  onJoinClick?: (pool: PoolData) => void;
}

export const PoolCard: React.FC<PoolCardProps> = ({ pool, onJoinClick }) => {
  const CART_FLOOR_PESEWAS = 35000; // GH₵ 350.00 Temu minimum in Ghana

  const totalPesewas =
    pool.totalContributedPesewas ??
    (pool.joins
      ? pool.joins.reduce((sum, j) => sum + (j.contributionPesewas || 0), 0)
      : 0);

  const percentage = Math.min(
    100,
    Math.round((totalPesewas / CART_FLOOR_PESEWAS) * 100)
  );

  const isFloorReached = totalPesewas >= CART_FLOOR_PESEWAS;
  const participantCount = pool.participantCount ?? pool.joins?.length ?? 0;

  // Calculate time remaining
  const getTimeRemaining = (deadline: string) => {
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h left`;
    return `${hours}h left`;
  };

  const statusColors = {
    open: "bg-blue-50 text-blue-700 border-blue-200/80",
    funded: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    ordered: "bg-purple-50 text-purple-700 border-purple-200/80",
    shipped: "bg-amber-50 text-amber-700 border-amber-200/80",
    delivered: "bg-slate-100 text-slate-800 border-slate-300",
    dead: "bg-red-50 text-red-700 border-red-200/80",
  }[pool.status];

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 flex flex-col justify-between overflow-hidden">
      {/* Top Banner & Category */}
      <div className="p-5 pb-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-slate-100 text-slate-700 border border-slate-200">
            {pool.category || "General"}
          </span>

          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${statusColors}`}
            >
              {pool.status === "open" && isFloorReached
                ? "Floor Reached"
                : pool.status}
            </span>
          </div>
        </div>

        {/* Title */}
        <Link
          to={`/pools/${pool.id}`}
          className="block group-hover:text-orange-600 transition-colors"
        >
          <h3 className="text-base font-bold text-slate-900 tracking-tight line-clamp-2 leading-snug">
            {pool.title}
          </h3>
        </Link>

        {/* Leader Info */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
          <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] uppercase">
            {pool.leader?.name ? pool.leader.name.slice(0, 2) : "LD"}
          </div>
          <span className="font-semibold text-slate-800 truncate max-w-[120px]">
            {pool.leader?.name || "Verified Leader"}
          </span>
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <div className="flex items-center gap-0.5 text-amber-500 font-bold ml-auto">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{pool.leader?.averageRating || "5.0"}</span>
          </div>
        </div>
      </div>

      {/* Cart Minimum Floor Progress */}
      <div className="px-5 py-3.5 bg-slate-50/70 border-y border-slate-100">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <div className="flex items-center gap-1 text-slate-600 font-medium">
            <span>Pool Cart:</span>
            <span className="font-bold text-slate-900">
              {formatGhs(totalPesewas)}
            </span>
            <span className="text-slate-400">/ {formatGhs(CART_FLOOR_PESEWAS)}</span>
          </div>
          <span
            className={`font-black text-xs ${
              isFloorReached ? "text-emerald-600" : "text-orange-600"
            }`}
          >
            {percentage}%
          </span>
        </div>

        {/* Progress Bar Track */}
        <div className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isFloorReached
                ? "bg-emerald-500"
                : "bg-orange-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Progress Hint */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3 text-slate-400" />
            {participantCount} shopper{participantCount === 1 ? "" : "s"}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            {getTimeRemaining(pool.deadlineAt)}
          </span>
        </div>
      </div>

      {/* Card Footer: Join Fee & Action */}
      <div className="p-4 px-5 flex items-center justify-between gap-3 bg-white">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Leader Join Fee
          </span>
          <span className="text-sm font-black text-slate-900">
            {formatGhs(pool.joinFeePesewas)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {pool.status === "open" && onJoinClick ? (
            <button
              onClick={() => onJoinClick(pool)}
              className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1"
            >
              Join Pool
            </button>
          ) : (
            <Link
              to={`/pools/${pool.id}`}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors flex items-center gap-1"
            >
              View Pool
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
