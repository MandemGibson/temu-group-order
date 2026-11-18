import { z } from "zod";

// Ghana phone regex: either 10 digits starting with 0 (e.g. 0241234567, 0501234567) or with +233 prefix
export const ghanaPhoneRegex = /^(?:\+233|233|0)[235][0-9]{8}$/;

// Auth Schemas
export const requestOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(ghanaPhoneRegex, "Invalid Ghana phone number format (e.g., 024XXXXXXX or +23324XXXXXXX)"),
});

export const verifyOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(ghanaPhoneRegex, "Invalid Ghana phone number format"),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "OTP must be a 6-digit numeric code"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
});

// Pool Creation Schema
export const createPoolSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(120, "Title cannot exceed 120 characters"),
  itemScreenshotUrl: z.string().url("Must be a valid URL").optional().nullable(),
  category: z.string().trim().max(50).optional().nullable(),
  targetPesewas: z
    .number()
    .int()
    .min(35000, "Target must be at least 350 GHS (35,000 pesewas)")
    .default(35000),
  minPerPersonPesewas: z
    .number()
    .int()
    .min(100, "Min contribution must be at least 1 GHS (100 pesewas)")
    .default(1000),
  maxParticipants: z
    .number()
    .int()
    .min(2, "Max participants must be at least 2")
    .max(50, "Max participants cannot exceed 50")
    .default(10),
  joinFeePesewas: z
    .number()
    .int()
    .min(0, "Join fee cannot be negative")
    .max(50000, "Join fee cannot exceed 500 GHS")
    .default(1000),
  deadlineHours: z
    .number()
    .int()
    .min(24, "Join deadline must be at least 24 hours")
    .max(72, "Join deadline cannot exceed 72 hours")
    .default(48),
  itemCostDeadlineHours: z
    .number()
    .int()
    .min(12, "Item cost deadline must be at least 12 hours")
    .max(48, "Item cost deadline cannot exceed 48 hours")
    .default(24),
  platformCommissionBps: z
    .number()
    .int()
    .min(0)
    .max(5000, "Platform commission cannot exceed 50%")
    .default(1000),
});

// Join Pool Cart Item Schema
export const joinPoolItemSchema = z.object({
  itemDescription: z.string().trim().min(2, "Item description is required"),
  temuItemUrl: z.string().url("Must be a valid URL").optional().nullable(),
  itemSpecs: z.string().trim().max(250).optional().nullable(),
  quantity: z.number().int().min(1, "Quantity must be at least 1").default(1),
  estimatedCostGhs: z.number().positive("Estimated cost must be greater than 0").optional().nullable(),
  itemScreenshotUrl: z.string().url("Must be a valid URL").optional().nullable(),
});

// Join Pool Schema
export const joinPoolSchema = z.object({
  items: z.array(joinPoolItemSchema).min(1, "At least one item is required in cart").optional(),
  itemDescription: z.string().optional(),
  temuItemUrl: z.string().optional().nullable(),
  itemSpecs: z.string().optional().nullable(),
  itemScreenshotUrl: z.string().optional().nullable(),
  contributionPesewas: z.number().int().positive().optional(),
  momoPhone: z
    .string()
    .trim()
    .regex(ghanaPhoneRegex, "Invalid MoMo phone number format")
    .optional(),
  idempotencyKey: z.string().trim().uuid().optional(),
});

// Item Cost Confirmation Schemas
export const confirmPaidSchema = z.object({
  proofOfPaymentUrl: z.string().url("Must be a valid image proof URL"),
  paymentReference: z.string().trim().min(3, "Payment reference is required"),
});

export const confirmFundedSchema = z.object({
  joinId: z.string().uuid("Invalid Join ID"),
});

// Fulfillment Schema
export const markShippedSchema = z.object({
  trackingNumber: z.string().trim().min(3, "SpeedAF tracking number is required"),
  shippingProofImageUrl: z.string().url("Must be a valid image URL").optional().nullable(),
});

// Dispute Schemas
export const raiseDisputeSchema = z.object({
  type: z.enum([
    "funded_dispute",
    "delivery_dispute",
    "fraud_report",
    "shipping_deadline_missed",
  ]),
  reason: z.string().trim().min(5, "Reason must be at least 5 characters"),
  evidenceUrl: z.string().url("Must be a valid URL").optional().nullable(),
});

export const resolveDisputeSchema = z.object({
  resolution: z.enum(["resolved_buyer", "resolved_leader", "dismissed"]),
  resolutionNote: z.string().trim().min(5, "Resolution note is required"),
});

// Review Schema
export const createReviewSchema = z.object({
  poolId: z.string().uuid("Invalid Pool ID"),
  poolJoinId: z.string().uuid("Invalid Pool Join ID"),
  rating: z.number().int().min(1).max(5, "Rating must be between 1 and 5"),
  comment: z.string().trim().max(500).optional().nullable(),
});
