"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.moolreService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../env");
const logger_1 = require("../utils/logger");
// Auto-detect Ghana mobile money network channel code for Collection (13=MTN, 6=Telecel, 7=AT)
function detectMoolreCollectionChannel(phone) {
    const local = phone.replace(/^\+233/, "0").replace(/^233/, "0");
    const prefix = local.substring(0, 3);
    if (["020", "050"].includes(prefix)) {
        return "6"; // Telecel (Vodafone)
    }
    if (["027", "057", "026", "056"].includes(prefix)) {
        return "7"; // AT (AirtelTigo)
    }
    return "13"; // MTN Ghana
}
// Auto-detect Ghana mobile money network channel code for Transfer (1=MTN, 6=Telecel, 7=AT)
function detectMoolreTransferChannel(phone) {
    const local = phone.replace(/^\+233/, "0").replace(/^233/, "0");
    const prefix = local.substring(0, 3);
    if (["020", "050"].includes(prefix)) {
        return "6"; // Telecel (Vodafone)
    }
    if (["027", "057", "026", "056"].includes(prefix)) {
        return "7"; // AT (AirtelTigo)
    }
    return "1"; // MTN Ghana
}
class MoolreServiceImplementation {
    apiUser;
    apiPubkey;
    apiKey;
    accountNumber;
    secret;
    constructor() {
        this.apiUser = env_1.env.MOOLRE_API_USER;
        this.apiPubkey = env_1.env.MOOLRE_API_PUBKEY;
        this.apiKey = env_1.env.MOOLRE_API_KEY;
        this.accountNumber = env_1.env.MOOLRE_ACCOUNT_NUMBER;
        this.secret = env_1.env.MOOLRE_WEBHOOK_SECRET;
    }
    async initiateCharge(params) {
        const { phone, amountPesewas, idempotencyKey, reference } = params;
        const ghsAmount = (amountPesewas / 100).toFixed(2);
        const localPhone = phone.replace(/^\+233/, "0").replace(/^233/, "0");
        const channel = detectMoolreCollectionChannel(localPhone);
        const isDev = env_1.env.NODE_ENV !== "production" || this.apiUser.includes("dev");
        if (isDev) {
            const mockRef = `MOOLRE_REF_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
            logger_1.logger.info(`💳 [MOOLRE PAYMENT MOCK] Initiated charge of GH₵ ${ghsAmount} to ${localPhone} (Channel ${channel}, Ref: ${idempotencyKey})`);
            return {
                success: true,
                moolreTxRef: mockRef,
                code: "TR099",
                message: "Payment request initiated successfully via Moolre prompt (Dev Mock)",
            };
        }
        try {
            const payload = {
                type: 1,
                channel,
                currency: "GHS",
                payer: localPhone,
                amount: ghsAmount,
                externalref: idempotencyKey,
                reference: reference || `Fides Pool Join (${idempotencyKey.slice(0, 8)})`,
                accountnumber: this.accountNumber,
            };
            const response = await fetch("https://api.moolre.com/open/transact/payment", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-USER": this.apiUser,
                    "X-API-PUBKEY": this.apiPubkey,
                },
                body: JSON.stringify(payload),
            });
            const resData = await response.json();
            logger_1.logger.info(`💳 [MOOLRE API PAYMENT RESPONSE] Status: ${response.status}`, { resData });
            if (resData.status === 1 || resData.code === "TR099") {
                return {
                    success: true,
                    moolreTxRef: String(resData.data || idempotencyKey),
                    code: resData.code,
                    message: resData.message || "Payment request initiated successfully",
                };
            }
            if (resData.code === "TP14") {
                return {
                    success: true,
                    moolreTxRef: idempotencyKey,
                    code: resData.code,
                    requiresOtp: true,
                    message: "Please complete phone verification sent via SMS",
                };
            }
            return {
                success: false,
                moolreTxRef: idempotencyKey,
                code: resData.code,
                message: resData.message || "Failed to initiate Moolre payment",
            };
        }
        catch (error) {
            logger_1.logger.error("❌ Moolre payment request error:", error);
            return {
                success: false,
                moolreTxRef: idempotencyKey,
                message: error.message || "Network error communicating with Moolre",
            };
        }
    }
    async validateName(receiverPhone) {
        const localPhone = receiverPhone
            .replace(/^\+233/, "0")
            .replace(/^233/, "0");
        const channel = detectMoolreTransferChannel(localPhone);
        const isDev = env_1.env.NODE_ENV !== "production" || this.apiUser.includes("dev");
        if (isDev) {
            return { success: true, accountName: "MOCK VERIFIED HOLDER" };
        }
        try {
            const response = await fetch("https://api.moolre.com/open/transact/validate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-USER": this.apiUser,
                    "X-API-KEY": this.apiPubkey || this.apiKey,
                },
                body: JSON.stringify({
                    type: 1,
                    receiver: localPhone,
                    channel,
                    currency: "GHS",
                    accountnumber: this.accountNumber,
                }),
            });
            const resData = await response.json();
            logger_1.logger.info(`🔍 [MOOLRE NAME VALIDATION RESPONSE]`, { resData });
            if (resData.status === 1 || resData.code === "AVD01") {
                return { success: true, accountName: resData.data };
            }
            return {
                success: false,
                message: resData.message || "Phone number not found",
            };
        }
        catch (error) {
            logger_1.logger.error("❌ Moolre name validation error:", error);
            return { success: false, message: error.message };
        }
    }
    async initiatePayoutTransfer(params) {
        const { receiverPhone, amountPesewas, externalRef, reference } = params;
        const ghsAmount = (amountPesewas / 100).toFixed(2);
        const localPhone = receiverPhone
            .replace(/^\+233/, "0")
            .replace(/^233/, "0");
        const channel = detectMoolreTransferChannel(localPhone);
        const isDev = env_1.env.NODE_ENV !== "production" || this.apiUser.includes("dev");
        if (isDev) {
            logger_1.logger.info(`💸 [MOOLRE PAYOUT MOCK] Disbursed GH₵ ${ghsAmount} to leader ${localPhone} (Ref: ${externalRef})`);
            return {
                success: true,
                moolreTxRef: `MOCK_PAYOUT_${Date.now()}`,
                receiverName: "MOCK LEADER DISBURSEMENT",
                code: "OBGH01",
                message: "Payout successful (Dev Mock)",
            };
        }
        try {
            const response = await fetch("https://api.moolre.com/open/transact/transfer", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-USER": this.apiUser,
                    "X-API-KEY": this.apiKey, // Requires Private API Key
                },
                body: JSON.stringify({
                    type: 1,
                    channel,
                    currency: "GHS",
                    amount: ghsAmount,
                    receiver: localPhone,
                    externalref: externalRef,
                    reference: reference || `Fides Leader Payout (${externalRef.slice(0, 8)})`,
                    accountnumber: this.accountNumber,
                }),
            });
            const resData = await response.json();
            logger_1.logger.info(`💸 [MOOLRE PAYOUT RESPONSE] Status: ${response.status}`, {
                resData,
            });
            if (resData.status === 1 ||
                resData.status === "1" ||
                resData.code === "OBGH01") {
                return {
                    success: true,
                    moolreTxRef: resData.data?.transactionid || externalRef,
                    receiverName: resData.data?.receivername,
                    code: resData.code,
                    message: "Payout initiated successfully",
                };
            }
            return {
                success: false,
                code: resData.code,
                message: Array.isArray(resData.message)
                    ? resData.message.join(" ")
                    : resData.message || "Payout transfer failed",
            };
        }
        catch (error) {
            logger_1.logger.error("❌ Moolre payout transfer error:", error);
            return { success: false, message: error.message };
        }
    }
    async checkPaymentStatus(externalRef) {
        try {
            const payload = {
                type: 1,
                idtype: 1,
                id: externalRef,
                accountnumber: this.accountNumber,
            };
            const response = await fetch("https://api.moolre.com/open/transact/status", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-USER": this.apiUser,
                    "X-API-KEY": this.apiPubkey || this.apiKey,
                },
                body: JSON.stringify(payload),
            });
            const resData = await response.json();
            logger_1.logger.info(`🔍 [MOOLRE STATUS API RESPONSE]`, { resData });
            return resData;
        }
        catch (error) {
            logger_1.logger.error("❌ Moolre status check error:", error);
            return null;
        }
    }
    verifyWebhookSignature(rawBody, signature) {
        if (!signature)
            return false;
        // In development mode, allow signature bypass if explicitly configured or signature is 'dev_bypass'
        if (env_1.env.NODE_ENV === "development" && signature === "dev_bypass") {
            return true;
        }
        try {
            const bodyBuffer = Buffer.isBuffer(rawBody)
                ? rawBody
                : typeof rawBody === "string"
                    ? Buffer.from(rawBody, "utf8")
                    : Buffer.from(JSON.stringify(rawBody), "utf8");
            const expectedSignature = crypto_1.default
                .createHmac("sha256", this.secret)
                .update(bodyBuffer)
                .digest("hex");
            const sigBuf = Buffer.from(signature, "utf8");
            const expBuf = Buffer.from(expectedSignature, "utf8");
            if (sigBuf.length !== expBuf.length) {
                return false;
            }
            return crypto_1.default.timingSafeEqual(sigBuf, expBuf);
        }
        catch (err) {
            logger_1.logger.error("Error verifying webhook signature:", err);
            return false;
        }
    }
}
exports.moolreService = new MoolreServiceImplementation();
