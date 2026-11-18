import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "./ImageUploader";
import { formatGhs } from "@/lib/utils";
import { PoolData } from "./PoolCard";
import { api } from "@/api/client";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { Wallet, ArrowRight, Plus, Trash2, ShoppingBag } from "lucide-react";

interface JoinPoolModalProps {
  pool: PoolData | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export interface CartItemForm {
  id: string;
  itemDescription: string;
  temuItemUrl: string;
  itemSpecs: string;
  quantity: number;
  estimatedCostGhs: string;
  itemScreenshotUrl: string;
}

export const JoinPoolModal: React.FC<JoinPoolModalProps> = ({
  pool,
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!pool) return null;

  const { creditBalancePesewas } = useAuthStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [items, setItems] = useState<CartItemForm[]>([
    {
      id: "1",
      itemDescription: "",
      temuItemUrl: "",
      itemSpecs: "",
      quantity: 1,
      estimatedCostGhs: (pool.minPerPersonPesewas / 100).toString(),
      itemScreenshotUrl: "",
    },
  ]);
  const [momoPhone, setMomoPhone] = useState("0241234567");
  const [loading, setLoading] = useState(false);

  const addItemToCart = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        itemDescription: "",
        temuItemUrl: "",
        itemSpecs: "",
        quantity: 1,
        estimatedCostGhs: "50",
        itemScreenshotUrl: "",
      },
    ]);
  };

  const removeItemFromCart = (index: number) => {
    if (items.length === 1) {
      toast.error("You must have at least one item in your join request.");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof CartItemForm, value: any) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const totalCartCostGhs = items.reduce((sum, item) => {
    const cost = parseFloat(item.estimatedCostGhs || "0");
    const qty = Math.max(1, item.quantity || 1);
    return sum + (isNaN(cost) ? 0 : cost * qty);
  }, 0);

  const totalCartCostPesewas = Math.round(totalCartCostGhs * 100);

  const totalJoinFeePesewas = pool.joinFeePesewas;
  const creditAppliedPesewas = Math.min(creditBalancePesewas, totalJoinFeePesewas);
  const netMoolreChargePesewas = Math.max(0, totalJoinFeePesewas - creditAppliedPesewas);

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate items
    for (let i = 0; i < items.length; i++) {
      if (!items[i].itemDescription.trim()) {
        toast.error(`Please enter a description for Cart Item #${i + 1}`);
        return;
      }
    }

    if (totalCartCostPesewas < pool.minPerPersonPesewas) {
      toast.error(
        `Total cart estimated cost must be at least ${formatGhs(pool.minPerPersonPesewas)}`
      );
      return;
    }

    setLoading(true);
    try {
      const payloadItems = items.map((it) => ({
        itemDescription: it.itemDescription.trim(),
        temuItemUrl: it.temuItemUrl ? it.temuItemUrl.trim() : undefined,
        itemSpecs: it.itemSpecs ? it.itemSpecs.trim() : undefined,
        quantity: Math.max(1, Number(it.quantity || 1)),
        estimatedCostGhs: parseFloat(it.estimatedCostGhs || "0"),
        itemScreenshotUrl: it.itemScreenshotUrl ? it.itemScreenshotUrl.trim() : undefined,
      }));

      const res = await api.post(`/pools/${pool.id}/join`, {
        items: payloadItems,
        contributionPesewas: totalCartCostPesewas,
        momoPhone: momoPhone.trim(),
      });

      toast.success(res.data.message || "Successfully joined group order pool with your cart items!");
      if (res.data.moolrePrompt?.message) {
        toast.info(res.data.moolrePrompt.message);
      }

      onSuccess();
      onClose();
    } catch (err) {
      // Interceptor handles toast error
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Join Pool: ${pool.title}`}
      description="Step 1 of 2: Add all items from your Temu cart that you want the leader to order for you."
      maxWidth="lg"
    >
      <div className="space-y-4 pt-1">
        {/* Step Indicator Pills */}
        <div className="flex items-center gap-2 pb-2">
          <div
            className={`flex-1 h-1.5 rounded-full transition-all ${
              step >= 1 ? "bg-[#fb5814]" : "bg-slate-200"
            }`}
          />
          <div
            className={`flex-1 h-1.5 rounded-full transition-all ${
              step >= 2 ? "bg-[#fb5814]" : "bg-slate-200"
            }`}
          />
        </div>

        <form onSubmit={handleJoinSubmit} className="space-y-5">
          {step === 1 ? (
            <>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                      <span className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-[#fb5814]" />
                        Cart Item #{index + 1}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemFromCart(index)}
                          className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      )}
                    </div>

                    <Input
                      label="Item Description / Title"
                      type="text"
                      placeholder="e.g. Baseus 65W GaN Fast Charger"
                      value={item.itemDescription}
                      onChange={(e) => updateItem(index, "itemDescription", e.target.value)}
                      required
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Quantity"
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value, 10) || 1)}
                        required
                      />

                      <Input
                        label="Estimated Item Cost (GH₵)"
                        type="number"
                        step="0.01"
                        placeholder="50.00"
                        value={item.estimatedCostGhs}
                        onChange={(e) => updateItem(index, "estimatedCostGhs", e.target.value)}
                        required
                      />
                    </div>

                    <Input
                      label="Size / Color / Model Specs (Optional)"
                      type="text"
                      placeholder="e.g. Black, EU 2-Pin Plug"
                      value={item.itemSpecs}
                      onChange={(e) => updateItem(index, "itemSpecs", e.target.value)}
                    />

                    <Input
                      label="Temu Web Link (Optional)"
                      type="url"
                      placeholder="https://www.temu.com/goods-..."
                      value={item.temuItemUrl}
                      onChange={(e) => updateItem(index, "temuItemUrl", e.target.value)}
                    />

                    <ImageUploader
                      value={item.itemScreenshotUrl}
                      onChange={(url) => updateItem(index, "itemScreenshotUrl", url)}
                      folder="item-screenshots"
                      label="Item Screenshot (Optional)"
                      placeholder="Upload screenshot of this Temu item"
                    />
                  </div>
                ))}
              </div>

              {/* Add Item Button */}
              <button
                type="button"
                onClick={addItemToCart}
                className="w-full py-2.5 px-4 rounded-xl border border-dashed border-[#fb5814]/60 text-[#fb5814] font-bold text-xs hover:bg-orange-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Another Item to Cart
              </button>

              {/* Cart Summary Banner */}
              <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-700 block">Total Cart Estimated Cost</span>
                  <span className="text-[11px] text-slate-500">{items.length} item(s) in cart</span>
                </div>
                <span className="text-xl font-black text-[#e64a19]">
                  GH₵ {totalCartCostGhs.toFixed(2)}
                </span>
              </div>

              <Button
                type="button"
                size="md"
                className="w-full h-11"
                onClick={() => {
                  for (let i = 0; i < items.length; i++) {
                    if (!items[i].itemDescription.trim()) {
                      toast.error(`Please enter description for Item #${i + 1}`);
                      return;
                    }
                  }
                  if (totalCartCostPesewas < pool.minPerPersonPesewas) {
                    toast.error(
                      `Total cart estimated cost must be at least ${formatGhs(
                        pool.minPerPersonPesewas
                      )}`
                    );
                    return;
                  }
                  setStep(2);
                }}
              >
                Proceed to Payment & Credit Summary <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          ) : (
            <>
              <Input
                label="Moolre Mobile Money Phone (MTN / Telecel / AT)"
                type="tel"
                placeholder="024XXXXXXX"
                value={momoPhone}
                onChange={(e) => setMomoPhone(e.target.value)}
                required
              />

              {/* Items Summary in Step 2 */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-xs">
                <div className="font-extrabold text-slate-900 border-b border-slate-200 pb-2 flex justify-between">
                  <span>Cart Items ({items.length})</span>
                  <span>Total: GH₵ {totalCartCostGhs.toFixed(2)}</span>
                </div>
                <ul className="space-y-1.5 text-slate-600 max-h-32 overflow-y-auto">
                  {items.map((it, idx) => (
                    <li key={idx} className="flex justify-between">
                      <span className="truncate max-w-[200px]">
                        #{idx + 1} {it.itemDescription} (x{it.quantity})
                      </span>
                      <span className="font-semibold text-slate-800">
                        GH₵ {(parseFloat(it.estimatedCostGhs || "0") * it.quantity).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-700 font-medium">
                  <span>Group Order Join Fee:</span>
                  <span className="font-bold text-slate-900">{formatGhs(totalJoinFeePesewas)}</span>
                </div>

                {creditAppliedPesewas > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                    <span className="flex items-center gap-1">
                      <Wallet className="h-3.5 w-3.5" /> Platform Credit Applied:
                    </span>
                    <span>-{formatGhs(creditAppliedPesewas)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-900 font-extrabold text-sm border-t border-slate-200 pt-2.5">
                  <span>Net Mobile Money Charge:</span>
                  <span className="text-[#e64a19]">{formatGhs(netMoolreChargePesewas)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  className="w-1/3 h-11"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  size="md"
                  className="w-2/3 h-11"
                  isLoading={loading}
                >
                  Confirm & Pay ({formatGhs(netMoolreChargePesewas)})
                </Button>
              </div>
            </>
          )}
        </form>
      </div>
    </Modal>
  );
};
