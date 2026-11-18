import React, { useEffect, useState } from "react";
import { api } from "@/api/client";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatGhs } from "@/lib/utils";
import { UploadProofModal } from "@/components/FulfillmentSection";
import { ReviewModal } from "@/components/ReviewModal";
import { toast } from "sonner";
import {
  ShoppingBag,
  Wallet,
  CheckCircle2,
  Clock,
  Truck,
  Star,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

export const BuyerOrdersView: React.FC = () => {
  const { setCreditBalance } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [creditLedger, setCreditLedger] = useState<any[]>([]);
  const [creditBalancePesewas, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedProofJoinId, setSelectedProofJoinId] = useState<string | null>(null);
  const [reviewPool, setReviewPool] = useState<{ poolId: string; poolJoinId: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, creditRes] = await Promise.all([
        api.get("/me/orders"),
        api.get("/me/credit"),
      ]);

      setOrders(ordersRes.data.orders || []);
      setBalance(creditRes.data.creditBalancePesewas || 0);
      setCreditBalance(creditRes.data.creditBalancePesewas || 0);
      setCreditLedger(creditRes.data.ledger || []);
    } catch (err) {
      // Handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConfirmDelivery = async (joinId: string) => {
    try {
      const res = await api.post(`/pool-joins/${joinId}/confirm-delivery`);
      toast.success(res.data.message || "Delivery confirmed!");
      fetchData();
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

  return (
    <div className="space-y-8 pb-12">
      {/* Credit Balance Header Card */}
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0 shadow-lg">
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fb5814] text-white shadow-md shadow-orange-500/30">
              <Wallet className="h-7 w-7" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Available Platform Credit
              </span>
              <div className="text-3xl font-black text-white mt-0.5">
                {formatGhs(creditBalancePesewas)}
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Automatically applied at checkout to discount your pool join fees.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Orders Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-[#fb5814]" />
          My Group Orders ({orders.length})
        </h2>

        {orders.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            You haven't joined any group orders yet. Browse open pools to get started!
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((join) => {
              const pool = join.pool;
              const isDelivered =
                join.buyerConfirmedDeliveredAt !== null ||
                join.leaderMarkedDeliveredAt !== null ||
                pool.status === "delivered";

              return (
                <Card key={join.id} className="p-5 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={pool.status} />
                        <span className="text-xs text-slate-500 font-medium">
                          Joined {new Date(join.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-lg mt-1">
                        {pool.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {join.itemCostStatus === "unpaid" && pool.status === "funded" && (
                        <Button
                          size="sm"
                          onClick={() => setSelectedProofJoinId(join.id)}
                        >
                          <UploadProofModal
                            joinId={selectedProofJoinId}
                            isOpen={selectedProofJoinId === join.id}
                            onClose={() => setSelectedProofJoinId(null)}
                            onSuccess={fetchData}
                          />
                          Upload Item Cost Proof
                        </Button>
                      )}

                      {pool.status === "shipped" && !join.buyerConfirmedDeliveredAt && (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => handleConfirmDelivery(join.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" /> Confirm Package Delivered
                        </Button>
                      )}

                      {isDelivered && !join.review && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setReviewPool({ poolId: pool.id, poolJoinId: join.id })
                          }
                        >
                          <Star className="h-4 w-4 text-amber-500 fill-amber-400" />
                          Leave Review
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Joined Items & Shipping Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Temu Cart Items ({join.items && join.items.length > 0 ? join.items.length : 1})
                      </span>
                      {join.items && join.items.length > 0 ? (
                        <div className="space-y-1 mt-1">
                          {join.items.map((it: any, idx: number) => (
                            <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                              <p className="font-extrabold text-slate-900">{it.itemDescription} (x{it.quantity})</p>
                              {it.itemSpecs && <p className="text-slate-500 text-[11px]">{it.itemSpecs}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="font-bold text-slate-900">{join.itemDescription || "General Temu Item"}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Item Cost Status
                      </span>
                      <div className="font-semibold text-slate-900">
                        <Badge
                          variant={
                            join.itemCostStatus === "funded"
                              ? "success"
                              : join.itemCostStatus === "proof_uploaded"
                              ? "warning"
                              : "secondary"
                          }
                        >
                          {join.itemCostStatus}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Shipping Tracking & Proof
                      </span>
                      {pool.trackingNumber ? (
                        <div className="space-y-1">
                          <p className="font-extrabold text-[#e64a19] flex items-center gap-1">
                            <Truck className="h-3.5 w-3.5" /> {pool.trackingNumber}
                          </p>
                          {pool.shippingProofImageUrl && (
                            <a
                              href={pool.shippingProofImageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#fb5814] underline font-semibold flex items-center gap-1"
                            >
                              View Shipping Proof Image <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <p className="text-slate-400 italic">Awaiting Leader Shipping</p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewPool && (
        <ReviewModal
          poolId={reviewPool.poolId}
          poolJoinId={reviewPool.poolJoinId}
          isOpen={!!reviewPool}
          onClose={() => setReviewPool(null)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
};
