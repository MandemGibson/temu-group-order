import React, { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { PoolData } from "@/components/pools/PoolCard";
import { useAuthStore } from "@/store/useAuthStore";
import { formatGhs } from "@/lib/utils";
import { api } from "@/api/client";
import { toast } from "sonner";
import { ImageUploader } from "@/components/ImageUploader";
import {
  Plus,
  Trash2,
  ShoppingBag,
  Wallet,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

interface CartItemInput {
  itemDescription: string;
  temuItemUrl: string;
  itemSpecs: string;
  quantity: number;
  estimatedCostGhs: string;
  itemScreenshotUrl: string;
}

interface JoinDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pool: PoolData | null;
  onJoinSuccess: () => void;
  onOpenAuth: () => void;
}

export const JoinDrawer: React.FC<JoinDrawerProps> = ({
  isOpen,
  onClose,
  pool,
  onJoinSuccess,
  onOpenAuth,
}) => {
  const { user, token, creditBalancePesewas, setCreditBalance } = useAuthStore();

  const [items, setItems] = useState<CartItemInput[]>([
    {
      itemDescription: "",
      temuItemUrl: "",
      itemSpecs: "",
      quantity: 1,
      estimatedCostGhs: "",
      itemScreenshotUrl: "",
    },
  ]);

  const [momoPhone, setMomoPhone] = useState(user?.phone || "");
  const [submitting, setSubmitting] = useState(false);

  if (!pool) return null;

  // Pricing calculations
  const joinFeePesewas = pool.joinFeePesewas;
  const availableCredit = creditBalancePesewas || 0;
  const creditAppliedPesewas = Math.min(availableCredit, joinFeePesewas);
  const netMoolrePaidPesewas = joinFeePesewas - creditAppliedPesewas;

  // Cart total estimate
  const estimatedTotalGhs = items.reduce((sum, item) => {
    const cost = parseFloat(item.estimatedCostGhs) || 0;
    return sum + cost * (item.quantity || 1);
  }, 0);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        itemDescription: "",
        temuItemUrl: "",
        itemSpecs: "",
        quantity: 1,
        estimatedCostGhs: "",
        itemScreenshotUrl: "",
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof CartItemInput,
    value: any
  ) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      onClose();
      onOpenAuth();
      return;
    }

    // Validate at least one valid item
    const validItems = items.filter((it) => it.itemDescription.trim().length > 0);
    if (validItems.length === 0) {
      toast.error("Please provide a description for at least one item from Temu");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        items: validItems.map((it) => ({
          itemDescription: it.itemDescription.trim(),
          temuItemUrl: it.temuItemUrl.trim() || undefined,
          itemSpecs: it.itemSpecs.trim() || undefined,
          quantity: Math.max(1, it.quantity || 1),
          estimatedCostGhs: parseFloat(it.estimatedCostGhs) || undefined,
          itemScreenshotUrl: it.itemScreenshotUrl || undefined,
        })),
        momoPhone: momoPhone.trim() || user?.phone,
      };

      const res = await api.post(`/pools/${pool.id}/join`, payload);

      if (netMoolrePaidPesewas === 0) {
        toast.success("Joined pool successfully using platform credit!");
        setCreditBalance(Math.max(0, availableCredit - creditAppliedPesewas));
      } else {
        toast.success(
          "Join initiated! Please approve the Mobile Money prompt on your phone."
        );
      }

      onJoinSuccess();
      onClose();
    } catch (err: any) {
      // Error handled by api client interceptor
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Join Temu Order Pool"
      description={`Add your items to ${pool.leader.name || "Leader"}'s pool`}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Pool Summary Header */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900 truncate max-w-[220px]">
              {pool.title}
            </h4>
            <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Verified Leader: {pool.leader.name || "Group Leader"}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Join Fee
            </span>
            <span className="text-sm font-black text-slate-900">
              {formatGhs(joinFeePesewas)}
            </span>
          </div>
        </div>

        {/* Multi-Item Cart Builder */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-orange-600" />
              <h4 className="text-sm font-bold text-slate-900">
                Your Temu Cart Items
              </h4>
            </div>
            {estimatedTotalGhs > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                Est: GH₵ {estimatedTotalGhs.toFixed(2)}
              </span>
            )}
          </div>

          {items.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs space-y-3 relative group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Item #{idx + 1}
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1 text-slate-400 hover:text-red-600 transition-colors rounded-lg"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Item Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Item Title / Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wireless Noise Canceling Earbuds"
                  value={item.itemDescription}
                  onChange={(e) =>
                    handleItemChange(idx, "itemDescription", e.target.value)
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Quantity */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(
                        idx,
                        "quantity",
                        Math.max(1, parseInt(e.target.value) || 1)
                      )
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                {/* Estimated Cost in GHS */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Temu Price per Unit (GH₵)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 45.00"
                    value={item.estimatedCostGhs}
                    onChange={(e) =>
                      handleItemChange(idx, "estimatedCostGhs", e.target.value)
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Size / Color Specs */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Size, Color, or Variations
                </label>
                <input
                  type="text"
                  placeholder="e.g. Size 42, Matte Black, Model B"
                  value={item.itemSpecs}
                  onChange={(e) =>
                    handleItemChange(idx, "itemSpecs", e.target.value)
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              {/* Temu Product URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Temu Item Web Link
                </label>
                <input
                  type="url"
                  placeholder="https://www.temu.com/goods-..."
                  value={item.temuItemUrl}
                  onChange={(e) =>
                    handleItemChange(idx, "temuItemUrl", e.target.value)
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              {/* Item Screenshot Proof */}
              <div>
                <ImageUploader
                  value={item.itemScreenshotUrl}
                  onChange={(url) =>
                    handleItemChange(idx, "itemScreenshotUrl", url)
                  }
                  label="Upload Item Screenshot (Optional)"
                  folder="cart-items"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddItem}
            className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-orange-500 hover:bg-orange-50/50 text-slate-600 hover:text-orange-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            + Add Another Item from Temu
          </button>
        </div>

        {/* Financial Breakdown & MoMo Prompt Info */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Pool Leader Join Fee:</span>
            <span className="font-semibold text-slate-900">
              {formatGhs(joinFeePesewas)}
            </span>
          </div>

          {availableCredit > 0 && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span className="flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5" />
                Available Platform Credit Applied:
              </span>
              <span>- {formatGhs(creditAppliedPesewas)}</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-black text-slate-900">
            <span>Net Mobile Money Charge:</span>
            <span className="text-orange-600">
              {netMoolrePaidPesewas === 0
                ? "FREE (100% Credit)"
                : formatGhs(netMoolrePaidPesewas)}
            </span>
          </div>

          {netMoolrePaidPesewas > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200/80">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Money Phone (MTN, Telecel, AT)
              </label>
              <input
                type="tel"
                required
                value={momoPhone}
                onChange={(e) => setMomoPhone(e.target.value)}
                placeholder="024XXXXXXX"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                A prompt will appear on your phone to authorize payment.
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-2 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              "Processing..."
            ) : (
              <>
                <span>Join & Authorize Pool</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </Sheet>
  );
};
