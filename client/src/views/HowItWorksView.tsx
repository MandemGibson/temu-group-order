import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TEMU_MIN_ORDER_GHS } from "@/config";
import {
  ShoppingBag,
  ShieldCheck,
  Zap,
  Users,
  CheckCircle2,
  Truck,
  ArrowRight,
  HelpCircle,
  Clock,
  Lock,
} from "lucide-react";

interface HowItWorksViewProps {
  onBrowsePools: () => void;
  onBecomeLeader: () => void;
}

export const HowItWorksView: React.FC<HowItWorksViewProps> = ({
  onBrowsePools,
  onBecomeLeader,
}) => {
  const steps = [
    {
      step: "01",
      title: "Browse or Create a Group Order Pool",
      description:
        `Leaders or shoppers create a pool with a target cart floor of GH₵ ${TEMU_MIN_ORDER_GHS}.00 to unlock free Temu international shipping to Ghana.`,
      icon: <ShoppingBag className="w-6 h-6 text-[#fb5814]" />,
    },
    {
      step: "02",
      title: "Join & Lock Escrow Fee via Moolre MoMo",
      description:
        "Buyers specify item details and pay a small join fee via MTN, Telecel, or AT Mobile Money. Platform credit automatically applies.",
      icon: <Lock className="w-6 h-6 text-blue-600" />,
    },
    {
      step: "03",
      title: "Two-Sided Item Cost Confirmation",
      description:
        `Once the GH₵ ${TEMU_MIN_ORDER_GHS} threshold is met, buyers send item costs to the leader and upload payment proof. The leader verifies and locks in receipt.`,
      icon: <ShieldCheck className="w-6 h-6 text-emerald-600" />,
    },
    {
      step: "04",
      title: "Temu Order & SpeedAF Waybill Tracking",
      description:
        "Leader places the batch order on Temu within 24–48 hours, enters the SpeedAF tracking number, and uploads the shipping waybill proof image.",
      icon: <Truck className="w-6 h-6 text-purple-600" />,
    },
    {
      step: "05",
      title: "Local Delivery & Verified Buyer Reviews",
      description:
        "Items arrive at the leader's local pickup hub. Once delivery is completed, buyers confirm receipt and leave a 5-star leader rating.",
      icon: <CheckCircle2 className="w-6 h-6 text-[#fb5814]" />,
    },
  ];

  const faqs = [
    {
      q: "What happens if a pool does not reach the GH₵ 350 target before the deadline?",
      a: "If a pool fails to meet the GH₵ 350 cart floor by its deadline, it is automatically marked 'dead', and all join fees are 100% credited back to buyers' platform balance for future pools.",
    },
    {
      q: "How does item cost payment work?",
      a: "Join fees are handled securely through Moolre Mobile Money escrow. Item costs are paid directly to the verified leader after the pool reaches its target floor, backed by two-sided receipt confirmation.",
    },
    {
      q: "How are group leaders verified?",
      a: "Leaders undergo identity verification (Ghana Card + selfie submission) and administrative approval before they can publish group order pools.",
    },
  ];

  return (
    <div className="space-y-12 max-w-5xl mx-auto py-4">
      {/* Header Banner */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100 text-[#e64a19] text-xs font-bold uppercase tracking-wider">
          <HelpCircle className="w-4 h-4" /> Simple 5-Step Process
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          How Temu Group Buying Works in Ghana
        </h1>
        <p className="text-slate-600 text-base max-w-2xl mx-auto leading-relaxed">
          Never pay heavy solo international shipping fees again. Pool your Temu orders with verified community leaders across Accra, Kumasi, Tema, and Sunyani.
        </p>
      </div>

      {/* 5-Step Process Stepper */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {steps.map((s, idx) => (
          <Card
            key={idx}
            className="p-6 border border-slate-200/80 bg-white rounded-2xl shadow-xs hover:shadow-md transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">{s.icon}</div>
              <span className="text-2xl font-black text-slate-300">{s.step}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 leading-snug">{s.title}</h3>
            <p className="text-slate-600 text-xs leading-relaxed">{s.description}</p>
          </Card>
        ))}
      </div>

      {/* Frequently Asked Questions */}
      <div className="space-y-6 pt-6 border-t border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 text-center">Frequently Asked Questions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {faqs.map((f, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-2">
              <h4 className="font-bold text-slate-900 text-sm">{f.q}</h4>
              <p className="text-slate-600 text-xs leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Footer */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-bold text-white">Ready to Save on Your Next Temu Order?</h3>
          <p className="text-slate-400 text-xs mt-1">Browse active pools or apply to become a verified group leader.</p>
        </div>
        <div className="flex gap-3">
          <Button size="md" className="h-11" onClick={onBrowsePools}>
            Browse Active Pools <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
          <Button size="md" variant="outline" className="h-11 bg-white/10 text-white border-white/20 hover:bg-white/20" onClick={onBecomeLeader}>
            Become a Leader
          </Button>
        </div>
      </div>
    </div>
  );
};
