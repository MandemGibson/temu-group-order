import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        primary: "bg-[#fff3ee] text-[#e64a19] border border-orange-200/60",
        secondary: "bg-slate-100 text-slate-800 border border-slate-200",
        success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        warning: "bg-amber-50 text-amber-700 border border-amber-200",
        danger: "bg-red-50 text-red-700 border border-red-200",
        info: "bg-blue-50 text-blue-700 border border-blue-200",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export function StatusBadge({ status }: { status: string }) {
  let variant: "primary" | "secondary" | "success" | "warning" | "danger" | "info" = "secondary";
  let label = status;

  switch (status) {
    case "open":
      variant = "primary";
      label = "Open Pool";
      break;
    case "funded":
      variant = "success";
      label = "Funded (Goal Met)";
      break;
    case "ordered":
      variant = "info";
      label = "Leader Ordered";
      break;
    case "shipped":
      variant = "info";
      label = "Shipped";
      break;
    case "delivered":
      variant = "success";
      label = "Delivered";
      break;
    case "dead":
      variant = "danger";
      label = "Expired / Dead";
      break;
    default:
      label = status;
  }

  return <Badge variant={variant}>{label}</Badge>;
}
