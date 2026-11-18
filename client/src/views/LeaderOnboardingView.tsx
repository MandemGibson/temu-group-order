import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ImageUploader } from "@/components/ImageUploader";
import { useAuthStore } from "@/store/useAuthStore";
import { api } from "@/api/client";
import { toast } from "sonner";
import { TEMU_MIN_ORDER_GHS } from "@/config";
import { ShieldCheck, Sparkles, Upload, CheckCircle2, UserCheck, ArrowRight } from "lucide-react";

export const LeaderOnboardingView: React.FC = () => {
  const { user, token } = useAuthStore();

  const [ghanaCardNumber, setGhanaCardNumber] = useState("GHA-123456789-0");
  const [selfieImageUrl, setSelfieImageUrl] = useState("https://example.com/selfie.jpg");
  const [city, setCity] = useState("Accra");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(user?.leaderOnboardingStatus === "pending_review");

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Please sign in with your phone number to submit an application.");
      return;
    }

    setLoading(true);
    try {
      // In backend, application updates leader onboarding fields
      await api.post("/auth/leader-application", {
        ghanaCardNumber: ghanaCardNumber.trim(),
        selfieImageUrl: selfieImageUrl.trim(),
        city,
        bio: bio.trim(),
      });

      toast.success("Application submitted successfully! Our admin team will review your Ghana Card details.");
      setSubmitted(true);
    } catch (err) {
      // Handled by API interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100 text-[#e64a19] text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" /> Become a Verified Leader
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Lead Temu Group Orders in Your City & Earn
        </h1>
        <p className="text-slate-600 text-sm max-w-xl mx-auto leading-relaxed">
          Help community buyers hit Temu’s GH₵ {TEMU_MIN_ORDER_GHS} cart floor while earning leader join fees on every successful group order pool.
        </p>
      </div>

      {/* Leader Benefits */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border border-slate-200/80 bg-white rounded-2xl space-y-2">
          <Sparkles className="w-6 h-6 text-[#fb5814]" />
          <h3 className="font-bold text-slate-900 text-sm">Earn Join Fees</h3>
          <p className="text-slate-600 text-xs leading-relaxed">Keep leader join fees (GH₵ 5 – GH₵ 20 per buyer) on every completed group order pool.</p>
        </Card>
        <Card className="p-5 border border-slate-200/80 bg-white rounded-2xl space-y-2">
          <UserCheck className="w-6 h-6 text-emerald-600" />
          <h3 className="font-bold text-slate-900 text-sm">Verified Leader Badge</h3>
          <p className="text-slate-600 text-xs leading-relaxed">Build buyer trust with a verified identity badge and 5-star public ratings.</p>
        </Card>
        <Card className="p-5 border border-slate-200/80 bg-white rounded-2xl space-y-2">
          <CheckCircle2 className="w-6 h-6 text-blue-600" />
          <h3 className="font-bold text-slate-900 text-sm">Automated Escrow</h3>
          <p className="text-slate-600 text-xs leading-relaxed">Automated sweeps ensure zero hassle disburse logic straight to your Moolre account.</p>
        </Card>
      </div>

      {/* Application Form or Status */}
      {submitted ? (
        <Card className="p-8 border border-emerald-200 bg-emerald-50 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-emerald-900">Application Under Review</h3>
          <p className="text-emerald-700 text-xs max-w-md mx-auto leading-relaxed">
            Thank you for applying! Our admin verification team is reviewing your Ghana Card submission. You will be notified via SMS once approved.
          </p>
        </Card>
      ) : (
        <Card className="p-6 border border-slate-200/80 bg-white rounded-2xl shadow-xs space-y-5">
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
            Leader Onboarding Application Form
          </h3>

          <form onSubmit={handleApply} className="space-y-4">
            <Input
              label="Ghana Card Number (GHA-XXXXXXXXX-X)"
              type="text"
              placeholder="GHA-721984210-9"
              value={ghanaCardNumber}
              onChange={(e) => setGhanaCardNumber(e.target.value)}
              required
            />

            <ImageUploader
              value={selfieImageUrl}
              onChange={(url) => setSelfieImageUrl(url)}
              folder="kyc-selfies"
              label="Ghana Card / Selfie Verification Photo"
              placeholder="Upload clear photo holding your Ghana Card"
            />

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Primary Delivery City / Hub Region
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#fb5814]"
              >
                <option value="Accra">Accra & Greater Accra Region</option>
                <option value="Kumasi">Kumasi & Ashanti Region</option>
                <option value="Tema">Tema & Ashaiman</option>
                <option value="Sunyani">Sunyani & Bono Region</option>
                <option value="Tamale">Tamale & Northern Region</option>
                <option value="Cape Coast">Cape Coast & Central Region</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Leader Bio & Import Experience
              </label>
              <textarea
                rows={3}
                placeholder="Describe your experience organizing group purchases or importing items..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#fb5814]"
              />
            </div>

            <Button type="submit" size="md" className="w-full h-11" isLoading={loading}>
              Submit Verification Application <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
};
