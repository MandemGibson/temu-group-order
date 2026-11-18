"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookRateLimiter = exports.apiRateLimiter = exports.otpRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Rate Limiter for OTP Generation Endpoint (Prevents SMS Pumping Attacks)
exports.otpRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // Limit each IP / phone request to 5 OTPs per 10 mins
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: "Too many OTP verification requests. Please wait 10 minutes before trying again.",
    },
});
// General API Rate Limiter
exports.apiRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 requests per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: "Too many requests from this IP. Please try again later.",
    },
});
// Webhook Rate Limiter for Moolre payment gateway callbacks
exports.webhookRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // Limit to 60 callbacks per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: "Webhook request limit exceeded.",
    },
});
