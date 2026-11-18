import React, { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { api } from "@/api/client";
import { toast } from "sonner";
import { ImageUploader } from "@/components/ImageUploader";
import { Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

interface CreatePoolDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreatePoolDrawer: React.FC<CreatePoolDrawerProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [targetGhs, setTargetGhs] = useState("350");
  const [joinFeeGhs, setJoinFeeGhs] = useState("10");
  const [deadlineHours, setDeadlineHours] = useState("48");
  const [itemCostDeadlineHours, setItemCostDeadlineHours] = useState("24");
  const [maxParticipants, setMaxParticipants] = useState("10");
  const [itemScreenshotUrl, setItemScreenshotUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const categories = [
    "Electronics",
    "Fashion",
    "Home & Kitchen",
    "Beauty",
    "Others",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || title.trim().length < 3) {
      toast.error("Please enter a clear title for your pool");
      return;
    }

    const targetPesewas = Math.round((parseFloat(targetGhs) || 350) * 100);
    if (targetPesewas < 35000) {
      toast.error("Temu cart minimum in Ghana must be at least GH₵ 350.00");
      return;
    }

    setLoading(true);
    try {
      await api.post("/pools", {
        title: title.trim(),
        category,
        targetPesewas,
        joinFeePesewas: Math.round((parseFloat(joinFeeGhs) || 10) * 100),
        minPerPersonPesewas: 1000, // GH₵ 10 min
        maxParticipants: parseInt(maxParticipants) || 10,
        deadlineHours: parseInt(deadlineHours) || 48,
        itemCostDeadlineHours: parseInt(itemCostDeadlineHours) || 24,
        itemScreenshotUrl: itemScreenshotUrl || undefined,
      });

      toast.success("Pool launched successfully!");
      onSuccess();
      onClose();
      // Reset
      setTitle("");
      setItemScreenshotUrl("");
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Launch a New Temu Pool"
      description="Create a community group order for shoppers in your city."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Pool Title / Theme *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Accra Tech & Gadgets Bulk Order"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
        </div>

        {/* Category Pills */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  category === cat
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Target Cart Floor */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Minimum (GH₵) *
            </label>
            <input
              type="number"
              min="350"
              step="10"
              required
              value={targetGhs}
              onChange={(e) => setTargetGhs(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Temu requires min GH₵ 350
            </span>
          </div>

          {/* Leader Join Fee */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Your Leader Join Fee (GH₵)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              required
              value={joinFeeGhs}
              onChange={(e) => setJoinFeeGhs(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Typical fee: GH₵ 5 - 20
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Join Deadline */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Join Window
            </label>
            <select
              value={deadlineHours}
              onChange={(e) => setDeadlineHours(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            >
              <option value="24">24 Hours</option>
              <option value="36">36 Hours</option>
              <option value="48">48 Hours (Recommended)</option>
              <option value="72">72 Hours</option>
            </select>
          </div>

          {/* Item Cost Deadline */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Item Cost Window
            </label>
            <select
              value={itemCostDeadlineHours}
              onChange={(e) => setItemCostDeadlineHours(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            >
              <option value="12">12 Hours</option>
              <option value="24">24 Hours (Standard)</option>
              <option value="48">48 Hours</option>
            </select>
          </div>

          {/* Max Participants */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Max Shoppers
            </label>
            <input
              type="number"
              min="2"
              max="50"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>
        </div>

        {/* Cover Image Upload */}
        <div>
          <ImageUploader
            value={itemScreenshotUrl}
            onChange={setItemScreenshotUrl}
            label="Cover Image / Item Screenshot (Optional)"
            folder="pool-covers"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
        >
          {loading ? "Publishing Pool..." : "Launch Pool Now"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </Sheet>
  );
};
