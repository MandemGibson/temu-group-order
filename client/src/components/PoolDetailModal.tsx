import React from "react";
import { Modal } from "@/components/ui/modal";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatGhs } from "@/lib/utils";
import { PoolData } from "./PoolCard";
import {
  ShieldCheck,
  Star,
  Users,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

interface PoolDetailModalProps {
  pool: PoolData | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenJoin: (pool: PoolData) => void;
}

export const PoolDetailModal: React.FC<PoolDetailModalProps> = ({
  pool,
  isOpen,
  onClose,
  onOpenJoin,
}) => {
  if (!pool) return null;

  const currentTotal =
    pool.totalContributedPesewas ??
    (pool.joins?.reduce((sum, j) => sum + j.contributionPesewas, 0) || 0);

  const progressPercent = Math.min(
    100,
    Math.round((currentTotal / pool.targetPesewas) * 100)
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={pool.title}
      description={`Led by ${pool.leader.name || pool.leader.phone} • Ghana Temu Pool`}
      maxWidth="xl"
    >
      <div className="space-y-6 pt-2">
        {/* Status Header */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-2">
            <StatusBadge status={pool.status} />
            <span className="text-xs font-semibold text-slate-600">
              Category: {pool.category || "General"}
            </span>
          </div>
          <div className="text-xs font-bold text-[#e64a19]">
            {progressPercent}% to 350 GHS Floor
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#fb5814] to-orange-400"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
            <span>{formatGhs(currentTotal)} raised</span>
            <span>Cart Floor Target: {formatGhs(pool.targetPesewas)}</span>
          </div>
        </div>

        {/* Leader Profile Summary */}
        <div className="rounded-2xl border border-orange-200/60 bg-orange-50/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fb5814] text-white font-extrabold text-lg shadow-sm">
              {pool.leader.name ? pool.leader.name[0] : "L"}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-base">
                <span>{pool.leader.name || pool.leader.phone}</span>
                <span title="Verified Leader">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 fill-emerald-100" />
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-600 mt-0.5">
                <span className="flex items-center gap-1 font-semibold text-amber-700">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                  {pool.leader.averageRating ? pool.leader.averageRating.toFixed(1) : "5.0"} Average Rating
                </span>
                <span>•</span>
                <span>{pool.leader.completedPoolsCount || 12} successful pools</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Specs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Min per Person
            </span>
            <div className="font-extrabold text-slate-900 text-sm mt-0.5">
              {formatGhs(pool.minPerPersonPesewas)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Join Fee (Disbursed)
            </span>
            <div className="font-extrabold text-[#e64a19] text-sm mt-0.5">
              {formatGhs(pool.joinFeePesewas)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Item Cost Window
            </span>
            <div className="font-extrabold text-slate-900 text-sm mt-0.5">
              {pool.itemCostDeadlineHours}h After Funding
            </div>
          </div>
        </div>

        {/* Current Participants & Items */}
        {pool.joins && pool.joins.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Current Participants & Items ({pool.joins.length})
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {pool.joins.map((join: any, idx: number) => (
                <div key={join.id || idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{join.buyer?.name || `Participant #${idx + 1}`}</span>
                    <span className="text-[#e64a19]">{formatGhs(join.contributionPesewas)}</span>
                  </div>
                  {join.items && join.items.length > 0 ? (
                    <ul className="text-slate-600 text-[11px] space-y-0.5 pl-2 border-l-2 border-orange-300">
                      {join.items.map((it: any, i: number) => (
                        <li key={i} className="truncate">
                          • {it.itemDescription} (x{it.quantity}) {it.itemSpecs ? `- ${it.itemSpecs}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : join.itemDescription ? (
                    <p className="text-slate-600 text-[11px] truncate">
                      • {join.itemDescription}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Protection guarantee */}
        <div className="rounded-xl bg-slate-900 text-white p-4 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-[#fb5814]">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Temu Platform Buyer Guarantee</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            If this pool does not reach the 350 GHS minimum threshold before the deadline, your join fee is automatically voided and returned as 100% reusable platform credit.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {pool.status === "open" && (
            <Button
              onClick={() => {
                onClose();
                onOpenJoin(pool);
              }}
            >
              Join Pool Now ({formatGhs(pool.joinFeePesewas)})
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
