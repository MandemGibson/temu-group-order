"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitLeaderApplication = exports.getMe = exports.verifyOtp = exports.requestOtp = void 0;
const otp_store_1 = require("../services/otp.store");
const sms_service_1 = require("../services/sms.service");
const db_1 = require("../db");
const jwt_1 = require("../utils/jwt");
const requestOtp = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone || typeof phone !== "string") {
            res.status(400).json({ error: "Phone number is required" });
            return;
        }
        const normalized = otp_store_1.otpStore.normalizePhone(phone);
        const { allowed, waitSeconds } = otp_store_1.otpStore.canRequestOtp(normalized);
        if (!allowed) {
            res.status(429).json({
                error: `Please wait ${waitSeconds} seconds before requesting another OTP.`,
                waitSeconds,
            });
            return;
        }
        const code = otp_store_1.otpStore.generateOtp(normalized);
        await sms_service_1.smsService.sendOtp(normalized, code);
        const isDev = process.env.NODE_ENV === "development";
        res.status(200).json({
            message: "OTP sent successfully",
            phone: normalized,
            ...(isDev && {
                devCode: code,
                note: "devCode returned for local testing convenience",
            }),
        });
    }
    catch (error) {
        console.error("Error in requestOtp:", error);
        res.status(500).json({ error: "Failed to request OTP" });
    }
};
exports.requestOtp = requestOtp;
const verifyOtp = async (req, res) => {
    try {
        const { phone, code, name } = req.body;
        if (!phone || !code) {
            res.status(400).json({ error: "Phone number and OTP code are required" });
            return;
        }
        const normalized = otp_store_1.otpStore.normalizePhone(phone);
        const result = otp_store_1.otpStore.verifyOtp(normalized, String(code));
        if (!result.valid) {
            res.status(400).json({ error: result.reason || "Invalid OTP" });
            return;
        }
        // Find or create user record
        let user = await db_1.prisma.user.findUnique({
            where: { phone: normalized },
        });
        if (!user) {
            const defaultName = name && typeof name === "string" && name.trim().length > 0
                ? name.trim()
                : `Buyer_${normalized.slice(-4)}`;
            user = await db_1.prisma.user.create({
                data: {
                    phone: normalized,
                    name: defaultName,
                    phoneVerifiedAt: new Date(),
                },
            });
        }
        else if (!user.phoneVerifiedAt) {
            user = await db_1.prisma.user.update({
                where: { id: user.id },
                data: { phoneVerifiedAt: new Date() },
            });
        }
        const token = (0, jwt_1.generateToken)({
            userId: user.id,
            role: user.role,
            phone: user.phone,
        });
        res.status(200).json({
            message: "Authentication successful",
            token,
            user,
        });
    }
    catch (error) {
        console.error("Error in verifyOtp:", error);
        res.status(500).json({ error: "Failed to verify OTP" });
    }
};
exports.verifyOtp = verifyOtp;
const getMe = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Not authenticated" });
            return;
        }
        res.status(200).json({ user: req.user });
    }
    catch (error) {
        console.error("Error in getMe:", error);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
};
exports.getMe = getMe;
const submitLeaderApplication = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const { ghanaCardNumber, selfieImageUrl } = req.body;
        const updatedUser = await db_1.prisma.user.update({
            where: { id: req.user.id },
            data: {
                ghanaCardNumber: ghanaCardNumber ? String(ghanaCardNumber).trim() : undefined,
                selfieImageUrl: selfieImageUrl ? String(selfieImageUrl).trim() : undefined,
                leaderOnboardingStatus: "pending_review",
            },
        });
        res.json({
            message: "Leader application submitted for review",
            user: updatedUser,
        });
    }
    catch (error) {
        console.error("Error in submitLeaderApplication:", error);
        res.status(500).json({ error: "Failed to submit leader application" });
    }
};
exports.submitLeaderApplication = submitLeaderApplication;
