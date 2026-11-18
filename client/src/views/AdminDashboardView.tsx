import React, { useEffect, useState } from "react";
import { api } from "@/api/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShieldCheck, AlertTriangle, UserCheck, UserX, CheckCircle2 } from "lucide-react";

export const AdminDashboardView: React.FC = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dispute modal state
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<string>("resolved_buyer");
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [resolving, setResolving] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [appsRes, disputesRes] = await Promise.all([
        api.get("/admin/leader-applications"),
        api.get("/admin/disputes"),
      ]);

      setApplications(appsRes.data.applications || []);
      setDisputes(disputesRes.data.disputes || []);
    } catch (err) {
      // toast error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleApproveLeader = async (leaderId: string) => {
    try {
      await api.post(`/admin/leaders/${leaderId}/approve`);
      toast.success("Leader application approved!");
      fetchAdminData();
    } catch (err) {
      // toast error
    }
  };

  const handleSuspendLeader = async (leaderId: string) => {
    const reason = prompt("Enter suspension reason:");
    if (!reason) return;

    try {
      await api.post(`/admin/leaders/${leaderId}/suspend`, { reason });
      toast.success("Leader suspended!");
      fetchAdminData();
    } catch (err) {
      // toast error
    }
  };

  const handleResolveDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute) return;

    setResolving(true);
    try {
      await api.patch(`/admin/disputes/${selectedDispute.id}`, {
        status: resolutionStatus,
        adminNotes: adminNotes ? adminNotes.trim() : undefined,
      });
      toast.success("Dispute resolved successfully!");
      setSelectedDispute(null);
      setAdminNotes("");
      fetchAdminData();
    } catch (err) {
      // toast error
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fb5814]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Leader Applications Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#fb5814]" />
          Leader Applications & Onboarding ({applications.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {applications.map((app) => (
            <Card key={app.id} className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {app.name || app.phone}
                  </h3>
                  <p className="text-xs text-slate-500">{app.phone} • {app.email || "No email"}</p>
                </div>
                <Badge
                  variant={
                    app.leaderOnboardingStatus === "approved"
                      ? "success"
                      : app.leaderOnboardingStatus === "suspended"
                      ? "danger"
                      : "warning"
                  }
                >
                  {app.leaderOnboardingStatus}
                </Badge>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                {app.leaderOnboardingStatus !== "approved" && (
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => handleApproveLeader(app.id)}
                  >
                    <UserCheck className="h-4 w-4" /> Approve Leader
                  </Button>
                )}
                {app.leaderOnboardingStatus !== "suspended" && (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleSuspendLeader(app.id)}
                  >
                    <UserX className="h-4 w-4" /> Suspend
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Disputes Resolution Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Platform Disputes ({disputes.length})
        </h2>

        <div className="space-y-3">
          {disputes.map((dispute) => (
            <Card key={dispute.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="warning">{dispute.type}</Badge>
                  <span className="font-bold text-slate-900">
                    Raised by {dispute.raisedBy?.name || dispute.raisedBy?.phone}
                  </span>
                </div>
                <Badge
                  variant={
                    dispute.status === "open"
                      ? "danger"
                      : dispute.status === "under_review"
                      ? "warning"
                      : "success"
                  }
                >
                  {dispute.status}
                </Badge>
              </div>

              <p className="text-xs text-slate-700 font-medium">{dispute.reason}</p>

              {dispute.status === "open" && (
                <div className="pt-2 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => setSelectedDispute(dispute)}
                  >
                    Resolve Dispute
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Resolve Dispute Modal */}
      {selectedDispute && (
        <Modal
          isOpen={!!selectedDispute}
          onClose={() => setSelectedDispute(null)}
          title="Resolve Platform Dispute"
          description={`Reason: ${selectedDispute.reason}`}
          maxWidth="md"
        >
          <form onSubmit={handleResolveDispute} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Resolution Decision
              </label>
              <select
                value={resolutionStatus}
                onChange={(e) => setResolutionStatus(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#fb5814]"
              >
                <option value="resolved_buyer">Resolve in Favor of Buyer (Refund)</option>
                <option value="resolved_leader">Resolve in Favor of Leader</option>
                <option value="dismissed">Dismiss Dispute</option>
              </select>
            </div>

            <Input
              label="Admin Notes"
              type="text"
              placeholder="Explain the investigation findings and outcome..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />

            <Button type="submit" className="w-full" isLoading={resolving}>
              Save Dispute Resolution
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
};
