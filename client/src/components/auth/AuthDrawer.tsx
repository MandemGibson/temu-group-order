import React, { useState, useEffect } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { useAuthStore } from "@/store/useAuthStore";
import { api } from "@/api/client";
import { toast } from "sonner";
import { Phone, ShieldCheck, ArrowRight, RotateCw, CheckCircle2 } from "lucide-react";

interface AuthDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthDrawer: React.FC<AuthDrawerProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error("Please enter your Ghana phone number");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/otp/request", { phone: phone.trim() });
      toast.success(res.data.message || "OTP code sent via SMS!");
      setStep("otp");
      setCooldown(60);
    } catch {
      // Handled by api interceptor
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || code.trim().length !== 6) {
      toast.error("Please enter the 6-digit code received via SMS");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/otp/verify", {
        phone: phone.trim(),
        code: code.trim(),
        name: name.trim() || undefined,
      });

      setAuth(res.data.token, res.data.user);
      toast.success(`Welcome, ${res.data.user.name || "Shopper"}!`);
      if (onSuccess) onSuccess();
      onClose();
      // Reset state
      setStep("phone");
      setCode("");
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
      title={step === "phone" ? "Sign In or Register" : "Verify Phone Number"}
      description={
        step === "phone"
          ? "Enter your Ghana mobile number to join or create group orders."
          : `We sent a 6-digit SMS verification code to ${phone}`
      }
      maxWidth="sm"
    >
      {step === "phone" ? (
        <form onSubmit={handleRequestOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Ghana Mobile Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="tel"
                required
                autoFocus
                placeholder="024 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Supports MTN, Telecel, and AT networks.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Your Name (Optional for new users)
            </label>
            <input
              type="text"
              placeholder="e.g. Kwame Mensah"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>

          <div className="p-3 bg-orange-50/60 rounded-xl border border-orange-200/50 flex items-start gap-2.5 text-xs text-orange-900">
            <ShieldCheck className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <span>
              No password needed. We use secure 6-digit SMS verification for quick access.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {loading ? "Sending Code..." : "Continue with SMS OTP"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-center">
              Enter 6-Digit SMS Code
            </label>
            <input
              type="text"
              required
              autoFocus
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-full py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-2xl font-mono tracking-widest text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify & Sign In"}
            <CheckCircle2 className="w-4 h-4" />
          </button>

          <div className="flex items-center justify-between text-xs pt-2">
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="text-slate-500 hover:text-slate-800 underline transition-colors"
            >
              Change phone number
            </button>

            <button
              type="button"
              disabled={cooldown > 0}
              onClick={handleRequestOtp}
              className="text-orange-600 hover:text-orange-700 font-semibold disabled:text-slate-400 flex items-center gap-1 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend SMS"}
            </button>
          </div>
        </form>
      )}
    </Sheet>
  );
};
