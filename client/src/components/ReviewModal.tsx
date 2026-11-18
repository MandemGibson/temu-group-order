import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { api } from "@/api/client";
import { toast } from "sonner";
import { Star } from "lucide-react";

interface ReviewModalProps {
  poolId: string | null;
  poolJoinId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  poolId,
  poolJoinId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  if (!poolId || !poolJoinId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/reviews", {
        poolId,
        poolJoinId,
        rating,
        comment: comment ? comment.trim() : undefined,
      });
      toast.success("Review submitted successfully. Thank you!");
      onSuccess();
      onClose();
    } catch (err) {
      // toast error handled
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Leave Leader & Pool Review"
      description="Share your delivery experience with the Temu group order leader."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="space-y-1.5 text-center py-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Select Rating (1 - 5 Stars)
          </label>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-1.5 focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 ${
                    star <= rating
                      ? "fill-amber-400 text-amber-500"
                      : "text-slate-300"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Review Comments (Optional)
          </label>
          <textarea
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#fb5814]"
            placeholder="How was the leader's communication and package delivery?"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <Button type="submit" className="w-full" isLoading={loading}>
          Submit Verified Review
        </Button>
      </form>
    </Modal>
  );
};
