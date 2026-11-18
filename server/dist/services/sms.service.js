"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSms = exports.smsService = void 0;
const env_1 = require("../env");
const logger_1 = require("../utils/logger");
class ConsoleSmsService {
    async sendOtp(phone, code) {
        logger_1.logger.info(`[CONSOLE SMS] OTP Sent to ${phone} | Code: ${code} (Expires in ${env_1.env.OTP_EXPIRY_MINUTES}m)`);
        return true;
    }
    async sendSms(phone, text) {
        logger_1.logger.info(`[CONSOLE SMS] Notification Sent to ${phone} | Text: "${text}"`);
        return true;
    }
}
class MoolreHttpSmsService {
    vasKey;
    senderId;
    constructor() {
        this.vasKey = env_1.env.MOOLRE_VAS_KEY || env_1.env.SMS_API_KEY || "";
        this.senderId = env_1.env.SMS_SENDER_ID || "Fides";
    }
    async sendOtp(phone, code) {
        const text = `Your Fides verification code is ${code}. Expires in ${env_1.env.OTP_EXPIRY_MINUTES} minutes. Do not share.`;
        return this.sendSms(phone, text);
    }
    async sendSms(phone, text) {
        if (!this.vasKey || this.vasKey.includes("dev")) {
            logger_1.logger.warn("Moolre SMS VAS Key is not configured for production. Falling back to logger.");
            logger_1.logger.info(`[MOOLRE SMS MOCK] To: ${phone} | SenderID: ${this.senderId} | Content: "${text}"`);
            return true;
        }
        try {
            const localPhone = phone.replace(/^\+233/, "0").replace(/^233/, "0");
            const response = await fetch("https://api.moolre.com/open/sms/send", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-VASKEY": this.vasKey,
                },
                body: JSON.stringify({
                    type: 1,
                    senderid: this.senderId,
                    messages: [
                        {
                            recipient: localPhone,
                            message: text,
                        },
                    ],
                }),
            });
            const resData = await response.json();
            logger_1.logger.info(`[MOOLRE SMS DISPATCH RESPONSE] Status: ${response.status}`, { resData });
            return response.ok && (resData.status === 1 || resData.code === "SMS01");
        }
        catch (error) {
            logger_1.logger.error("Failed to send SMS via Moolre Gateway:", error);
            return false;
        }
    }
}
exports.smsService = env_1.env.NODE_ENV === "production" && env_1.env.SMS_PROVIDER !== "console"
    ? new MoolreHttpSmsService()
    : new ConsoleSmsService();
const sendSms = (phone, text) => exports.smsService.sendSms(phone, text);
exports.sendSms = sendSms;
