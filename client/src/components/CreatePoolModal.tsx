import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/api/client";
import { toast } from "sonner";
import { Plus, Sparkles } from "lucide-react";
import { TEMU_MIN_ORDER_GHS } from "@/config";

interface CreatePoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreatePoolModal: React.FC<CreatePoolModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [targetGhs, setTargetGhs] = useState(String(TEMU_MIN_ORDER_GHS));
  const [minPerPersonGhs, setMinPerPersonGhs] = useState("50");
  const [joinFeeGhs, setJoinFeeGhs] = useState("10");
  const [deadlineHours, setDeadlineHours] = useState("48");
  const [itemCostDeadlineHours, setItemCostDeadlineHours] = useState("24");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const minPesewas = TEMU_MIN_ORDER_GHS * 100;
    const targetPesewas = Math.round(
      parseFloat(targetGhs || String(TEMU_MIN_ORDER_GHS)) * 100,
    );
    const minPerPersonPesewas = Math.round(
      parseFloat(minPerPersonGhs || "50") * 100,
    );
    const joinFeePesewas = Math.round(parseFloat(joinFeeGhs || "10") * 100);
    const dHours = parseInt(deadlineHours || "48");
    const icHours = parseInt(itemCostDeadlineHours || "24");

    if (targetPesewas < minPesewas) {
      toast.error(
        `Target cart floor must be at least GH₵ ${TEMU_MIN_ORDER_GHS}.00`,
      );
      return;
    }

    setLoading(true);
    try {
      const submittedCategory = category === "Others" ? null : category;
      const res = await api.post("/pools", {
        title: title.trim(),
        category: submittedCategory,
        targetPesewas,
        minPerPersonPesewas,
        joinFeePesewas,
        deadlineHours: dHours,
        itemCostDeadlineHours: icHours,
      });

      toast.success(res.data.message || "Pool created successfully!");
      onSuccess();
      onClose();
    } catch (err) {
      // Handled by API interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Temu Group Order Pool"
      description="Set up a group order pool in Ghana Cedis (GH₵) to reach the GH₵ 350.00 free shipping cart floor."
      maxWidth="lg"
    >
      <form onSubmit={handleCreate} className="space-y-4 pt-2">
        <Input
          label="Pool Title"
          type="text"
          placeholder="e.g. Baseus Chargers & UGreen Braided Cables Group Order"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#fb5814]"
          >
            <option value="Electronics">Electronics & Tech</option>
            <option value="Fashion">Fashion & Apparel</option>
            <option value="Home & Kitchen">Home & Kitchenware</option>
            <option value="Beauty">Beauty & Personal Care</option>
            <option value="Toys & Kids">Toys & Kids</option>
            <option value="Others">Others (Uncategorized)</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Cart Floor Target (GH₵)"
            type="number"
            min="350"
            value={targetGhs}
            onChange={(e) => setTargetGhs(e.target.value)}
            required
          />

          <Input
            label="Min Contribution / Buyer (GH₵)"
            type="number"
            min="10"
            value={minPerPersonGhs}
            onChange={(e) => setMinPerPersonGhs(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Join Fee (GH₵)"
            type="number"
            min="5"
            value={joinFeeGhs}
            onChange={(e) => setJoinFeeGhs(e.target.value)}
            required
          />

          <Input
            label="Join Window (Hours)"
            type="number"
            min="24"
            max="72"
            value={deadlineHours}
            onChange={(e) => setDeadlineHours(e.target.value)}
            required
          />
        </div>

        <Button
          type="submit"
          size="md"
          className="w-full h-11"
          isLoading={loading}
        >
          <Sparkles className="h-4 w-4 mr-1" /> Publish Group Order Pool
        </Button>
      </form>
    </Modal>
  );
};
