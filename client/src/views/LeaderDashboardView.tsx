import React, { useEffect, useState } from "react";
import { api } from "@/api/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatGhs } from "@/lib/utils";
import { UpdateTrackingModal } from "@/components/FulfillmentSection";
import { toast } from "sonner";
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  Truck,
  Users,
  ShieldCheck,
  Award,
} from "lucide-react";

export const LeaderDashboardView: React.FC = () => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tracking modal state
  const [selectedPoolIdForTracking, setSelectedPoolIdForTracking] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [dashRes, payoutsRes] = await Promise.all([
        api.get("/leader/dashboard"),
        api.get("/leader/payouts"),
      ]);

      setDashboard(dashRes.data.dashboard || null);
      setPayouts(payoutsRes.data.payouts || []);
    } catch (err) {
      // toast error handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleConfirmFunded = async (joinId: string) => {
    try {
      await api.post(`/pool-joins/${joinId}/confirm-funded`);
      toast.success("Confirmed receipt of item cost!");
      fetchDashboardData();
    } catch (err) {
      // toast error
    }
  };

  const handleMarkDelivered = async (joinId: string) => {
    try {
      await api.post(`/pool-joins/${joinId}/mark-delivered`);
      toast.success("Marked package delivered for buyer!");
      fetchDashboardData();
    } catch (err) {
      // toast error
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fb5814]"></div>
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="space-y-8 pb-12">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 border-l-4 border-l-[#fb5814]">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Active Pools
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {dashboard.activePoolsCount}
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-amber-500">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Pending Proof Confirmations
          </span>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {dashboard.pendingProofsCount}
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-emerald-500">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Leader Earnings
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {formatGhs(dashboard.totalEarningsPesewas)}
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-blue-500">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Pools Led
          </span>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {dashboard.totalPoolsCount}
          </div>
        </Card>
      </div>

      {/* Active Pools Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <Award className="h-5 w-5 text-[#fb5814]" />
          My Active Group Pools ({dashboard.activePools?.length || 0})
        </h2>

        {dashboard.activePools?.map((pool: any) => (
          <Card key={pool.id} className="p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={pool.status} />
                  <span className="text-xs text-slate-500 font-medium">
                    {pool.joins?.length || 0} participants
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-lg mt-1">
                  {pool.title}
                </h3>
              </div>

              <Button
                size="sm"
                onClick={() => setSelectedPoolIdForTracking(pool.id)}
              >
                <Truck className="h-4 w-4" /> Enter Tracking & Proof Image
              </Button>
            </div>

            {/* Participants Item Cost & Delivery Actions */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Pool Participants & Item Cost Confirmations:
              </span>

              {pool.joins?.map((j: any) => (
                <div
                  key={j.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900">Join #{j.id.slice(0, 8)}</span>
                    <span className="ml-2 font-medium text-slate-500">
                      Cost status: <Badge variant="secondary">{j.itemCostStatus}</Badge>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {j.itemCostStatus === "proof_uploaded" && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleConfirmFunded(j.id)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Confirm Receipt
                      </Button>
                    )}

                    {!j.leaderMarkedDeliveredAt && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkDelivered(j.id)}
                      >
                        Mark Delivered
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Tracking Modal */}
      {selectedPoolIdForTracking && (
        <UpdateTrackingModal
          poolId={selectedPoolIdForTracking}
          isOpen={!!selectedPoolIdForTracking}
          onClose={() => setSelectedPoolIdForTracking(null)}
          onSuccess={fetchDashboardData}
        />
      )}
    </div>
  );
};
