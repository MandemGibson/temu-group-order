"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReviewSchema = exports.resolveDisputeSchema = exports.raiseDisputeSchema = exports.markShippedSchema = exports.confirmFundedSchema = exports.confirmPaidSchema = exports.joinPoolSchema = exports.joinPoolItemSchema = exports.createPoolSchema = exports.verifyOtpSchema = exports.requestOtpSchema = exports.ghanaPhoneRegex = void 0;
const zod_1 = require("zod");
// Ghana phone regex: either 10 digits starting with 0 (e.g. 0241234567, 0501234567) or with +233 prefix
exports.ghanaPhoneRegex = /^(?:\+233|233|0)[235][0-9]{8}$/;
// Auth Schemas
exports.requestOtpSchema = zod_1.z.object({
    phone: zod_1.z
        .string()
        .trim()
        .regex(exports.ghanaPhoneRegex, "Invalid Ghana phone number format (e.g., 024XXXXXXX or +23324XXXXXXX)"),
});
exports.verifyOtpSchema = zod_1.z.object({
    phone: zod_1.z
        .string()
        .trim()
        .regex(exports.ghanaPhoneRegex, "Invalid Ghana phone number format"),
    code: zod_1.z
        .string()
        .trim()
        .regex(/^\d{6}$/, "OTP must be a 6-digit numeric code"),
    name: zod_1.z.string().trim().min(2, "Name must be at least 2 characters").optional(),
});
// Pool Creation Schema
exports.createPoolSchema = zod_1.z.object({
    title: zod_1.z
        .string()
        .trim()
        .min(3, "Title must be at least 3 characters")
        .max(120, "Title cannot exceed 120 characters"),
    itemScreenshotUrl: zod_1.z.string().url("Must be a valid URL").optional().nullable(),
    category: zod_1.z.string().trim().max(50).optional().nullable(),
    targetPesewas: zod_1.z
        .number()
        .int()
        .min(35000, "Target must be at least 350 GHS (35,000 pesewas)")
        .default(35000),
    minPerPersonPesewas: zod_1.z
        .number()
        .int()
        .min(100, "Min contribution must be at least 1 GHS (100 pesewas)")
        .default(1000),
    maxParticipants: zod_1.z
        .number()
        .int()
        .min(2, "Max participants must be at least 2")
        .max(50, "Max participants cannot exceed 50")
        .default(10),
    joinFeePesewas: zod_1.z
        .number()
        .int()
        .min(0, "Join fee cannot be negative")
        .max(50000, "Join fee cannot exceed 500 GHS")
        .default(1000),
    deadlineHours: zod_1.z
        .number()
        .int()
        .min(24, "Join deadline must be at least 24 hours")
        .max(72, "Join deadline cannot exceed 72 hours")
        .default(48),
    itemCostDeadlineHours: zod_1.z
        .number()
        .int()
        .min(12, "Item cost deadline must be at least 12 hours")
        .max(48, "Item cost deadline cannot exceed 48 hours")
        .default(24),
    platformCommissionBps: zod_1.z
        .number()
        .int()
        .min(0)
        .max(5000, "Platform commission cannot exceed 50%")
        .default(1000),
});
// Join Pool Cart Item Schema
exports.joinPoolItemSchema = zod_1.z.object({
    itemDescription: zod_1.z.string().trim().min(2, "Item description is required"),
    temuItemUrl: zod_1.z.string().url("Must be a valid URL").optional().nullable(),
    itemSpecs: zod_1.z.string().trim().max(250).optional().nullable(),
    quantity: zod_1.z.number().int().min(1, "Quantity must be at least 1").default(1),
    estimatedCostGhs: zod_1.z.number().positive("Estimated cost must be greater than 0").optional().nullable(),
    itemScreenshotUrl: zod_1.z.string().url("Must be a valid URL").optional().nullable(),
});
// Join Pool Schema
exports.joinPoolSchema = zod_1.z.object({
    items: zod_1.z.array(exports.joinPoolItemSchema).min(1, "At least one item is required in cart").optional(),
    itemDescription: zod_1.z.string().optional(),
    temuItemUrl: zod_1.z.string().optional().nullable(),
    itemSpecs: zod_1.z.string().optional().nullable(),
    itemScreenshotUrl: zod_1.z.string().optional().nullable(),
    contributionPesewas: zod_1.z.number().int().positive().optional(),
    momoPhone: zod_1.z
        .string()
        .trim()
        .regex(exports.ghanaPhoneRegex, "Invalid MoMo phone number format")
        .optional(),
    idempotencyKey: zod_1.z.string().trim().uuid().optional(),
});
// Item Cost Confirmation Schemas
exports.confirmPaidSchema = zod_1.z.object({
    proofOfPaymentUrl: zod_1.z.string().url("Must be a valid image proof URL"),
    paymentReference: zod_1.z.string().trim().min(3, "Payment reference is required"),
});
exports.confirmFundedSchema = zod_1.z.object({
    joinId: zod_1.z.string().uuid("Invalid Join ID"),
});
// Fulfillment Schema
exports.markShippedSchema = zod_1.z.object({
    trackingNumber: zod_1.z.string().trim().min(3, "SpeedAF tracking number is required"),
    shippingProofImageUrl: zod_1.z.string().url("Must be a valid image URL").optional().nullable(),
});
// Dispute Schemas
exports.raiseDisputeSchema = zod_1.z.object({
    type: zod_1.z.enum([
        "funded_dispute",
        "delivery_dispute",
        "fraud_report",
        "shipping_deadline_missed",
    ]),
    reason: zod_1.z.string().trim().min(5, "Reason must be at least 5 characters"),
    evidenceUrl: zod_1.z.string().url("Must be a valid URL").optional().nullable(),
});
exports.resolveDisputeSchema = zod_1.z.object({
    resolution: zod_1.z.enum(["resolved_buyer", "resolved_leader", "dismissed"]),
    resolutionNote: zod_1.z.string().trim().min(5, "Resolution note is required"),
});
// Review Schema
exports.createReviewSchema = zod_1.z.object({
    poolId: zod_1.z.string().uuid("Invalid Pool ID"),
    poolJoinId: zod_1.z.string().uuid("Invalid Pool Join ID"),
    rating: zod_1.z.number().int().min(1).max(5, "Rating must be between 1 and 5"),
    comment: zod_1.z.string().trim().max(500).optional().nullable(),
});
