import React, { useEffect, useState } from "react";
import { api } from "@/api/client";
import { formatTimeAgo } from "@/lib/utils";
import {
  Bell,
  CheckCheck,
  ShoppingBag,
  ShieldCheck,
  Truck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
} from "lucide-react";

export interface NotificationItem {
  id: string;
  type: string;
  channel: string;
  title?: string;
  body?: string;
  readAt?: string | null;
  createdAt: string;
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  unreadCount: number;
  onRefreshUnread: () => void;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "pool_joined":
    case "pool_funded":
      return <ShoppingBag className="w-4 h-4 text-[#fb5814]" />;
    case "pool_shipped":
      return <Truck className="w-4 h-4 text-purple-600" />;
    case "proof_uploaded_needs_confirmation":
    case "delivery_marked_needs_confirmation":
      return <Clock className="w-4 h-4 text-amber-600" />;
    case "review_unlocked":
    case "dispute_resolved":
      return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    case "shipping_deadline_missed":
    case "pool_dead":
    case "dispute_opened":
      return <AlertTriangle className="w-4 h-4 text-red-600" />;
    default:
      return <Bell className="w-4 h-4 text-slate-500" />;
  }
};

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  unreadCount,
  onRefreshUnread,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data.notifications || []);
    } catch (err) {
      // Handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      onRefreshUnread();
    } catch (err) {
      // Handled
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      );
      onRefreshUnread();
    } catch (err) {
      // Handled
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#fb5814]" />
          <h3 className="font-extrabold text-slate-900 text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#fb5814] text-white font-bold text-[10px]">
              {unreadCount} new
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[11px] font-bold text-slate-500 hover:text-[#fb5814] flex items-center gap-1 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 font-medium">
            No notifications yet. You're all caught up!
          </div>
        ) : (
          notifications.map((n) => {
            const isUnread = !n.readAt;
            return (
              <div
                key={n.id}
                onClick={() => isUnread && handleMarkAsRead(n.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex gap-3 ${
                  isUnread
                    ? "bg-orange-50/50 border-orange-100 hover:bg-orange-50"
                    : "bg-white border-slate-100 hover:bg-slate-50"
                }`}
              >
                <div className="mt-0.5 p-2 rounded-lg bg-slate-100 shrink-0 h-8 w-8 flex items-center justify-center">
                  {getNotificationIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-xs truncate">
                      {n.title || "Notification"}
                    </h4>
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-[#fb5814] shrink-0" />
                    )}
                  </div>

                  <p className="text-slate-600 text-[11px] leading-snug line-clamp-2">
                    {n.body}
                  </p>

                  <span className="text-[10px] text-slate-400 font-semibold block pt-1">
                    {formatTimeAgo(n.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
