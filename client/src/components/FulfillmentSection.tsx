import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "./ImageUploader";
import { api } from "@/api/client";
import { toast } from "sonner";
import { Upload, Truck } from "lucide-react";

interface UploadProofModalProps {
  joinId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UploadProofModal: React.FC<UploadProofModalProps> = ({
  joinId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [proofUrl, setProofUrl] = useState("");
  const [loading, setLoading] = useState(false);

  if (!joinId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofUrl) {
      toast.error("Please upload your payment proof screenshot.");
      return;
    }

    setLoading(true);
    try {
      await api.post(`/pool-joins/${joinId}/proof`, {
        proofOfPaymentUrl: proofUrl.trim(),
      });
      toast.success("Payment proof submitted to leader!");
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
      title="Upload Item-Cost Payment Proof"
      description="Upload your MoMo receipt screenshot as proof of item cost payment to leader."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <ImageUploader
          value={proofUrl}
          onChange={(url) => setProofUrl(url)}
          folder="payment-proofs"
          label="MoMo Payment Receipt Screenshot"
          placeholder="Upload screenshot of MoMo transfer to leader"
        />
        <Button type="submit" className="w-full" isLoading={loading} disabled={!proofUrl}>
          <Upload className="h-4 w-4" /> Submit Payment Proof
        </Button>
      </form>
    </Modal>
  );
};

interface UpdateTrackingModalProps {
  poolId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UpdateTrackingModal: React.FC<UpdateTrackingModalProps> = ({
  poolId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [trackingNumber, setTrackingNumber] = useState("TEMU_GH_987654321");
  const [shippingProofImageUrl, setShippingProofImageUrl] = useState("");
  const [loading, setLoading] = useState(false);

  if (!poolId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/pools/${poolId}/tracking`, {
        trackingNumber: trackingNumber.trim(),
        shippingProofImageUrl: shippingProofImageUrl ? shippingProofImageUrl.trim() : undefined,
      });
      toast.success("Shipping tracking number and proof image submitted!");
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
      title="Enter Shipping Tracking & Proof Screenshot"
      description="Update SpeedAF/Temu package tracking number and upload shipping confirmation waybill screenshot."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <Input
          label="Temu / SpeedAF Tracking Number"
          type="text"
          placeholder="e.g. TEMU_GH_12345678"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          required
        />

        <ImageUploader
          value={shippingProofImageUrl}
          onChange={(url) => setShippingProofImageUrl(url)}
          folder="shipping-proofs"
          label="SpeedAF Waybill / Order Confirmation Screenshot"
          placeholder="Upload screenshot of Temu/SpeedAF order confirmation"
        />

        <Button type="submit" className="w-full" isLoading={loading}>
          <Truck className="h-4 w-4" /> Save Shipping Details & Mark Shipped
        </Button>
      </form>
    </Modal>
  );
};
