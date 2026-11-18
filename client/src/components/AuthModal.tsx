import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/api/client";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { Smartphone, KeyRound, ArrowRight, ShieldCheck } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("0241234567");
  const [name, setName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  const { setAuth } = useAuthStore();

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      toast.error("Please enter a valid Ghana phone number");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/otp/request", { phone });
      toast.success(res.data.message || "OTP code sent via SMS!");
      if (res.data.devOtpCode) {
        setDevCode(res.data.devOtpCode);
      }
      setStep("otp");
    } catch (err) {
      // Handled by api interceptor
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Please enter the 6-digit verification code");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/otp/verify", {
        phone,
        code: otpCode,
        name: name ? name.trim() : undefined,
      });

      setAuth(res.data.token, res.data.user);
      toast.success(`Welcome back, ${res.data.user.name || res.data.user.phone}!`);
      onClose();
      setStep("phone");
      setOtpCode("");
    } catch (err) {
      // Handled by api interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === "phone" ? "Sign In / Register" : "Enter Verification Code"}
      description={
        step === "phone"
          ? "Enter your Ghana mobile phone number to receive an SMS verification code."
          : `SMS OTP code dispatched to ${phone}.`
      }
      maxWidth="md"
    >
      {step === "phone" ? (
        <form onSubmit={handleRequestOtp} className="space-y-4 pt-2">
          <Input
            label="Ghana Phone Number"
            type="tel"
            placeholder="024XXXXXXX or +23324XXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <Input
            label="Full Name (Optional)"
            type="text"
            placeholder="e.g. Kwadwo Mensah"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="rounded-xl bg-orange-50 p-3 text-xs text-orange-900 border border-orange-200/60 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-[#fb5814] shrink-0 mt-0.5" />
            <span>
              Instant secure login. No passwords required. We'll send a 6-digit OTP code to your phone.
            </span>
          </div>

          <Button type="submit" className="w-full" isLoading={loading}>
            Send OTP Code <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4 pt-2">
          {devCode && (
            <div className="rounded-xl bg-slate-900 text-white p-3 text-xs font-mono flex items-center justify-between shadow-sm">
              <span>DEV MODE AUTO-OTP CODE:</span>
              <span className="font-extrabold text-base tracking-widest text-[#fb5814]">
                {devCode}
              </span>
            </div>
          )}

          <Input
            label="6-Digit OTP Code"
            type="text"
            placeholder="123456"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            maxLength={6}
            required
            autoFocus
          />

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("phone")}
              disabled={loading}
              className="w-1/3"
            >
              Back
            </Button>
            <Button type="submit" className="w-2/3" isLoading={loading}>
              Verify & Sign In
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
