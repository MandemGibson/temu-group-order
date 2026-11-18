import { env } from "../env";
import { logger } from "../utils/logger";

export interface ISmsService {
  sendOtp(phone: string, code: string): Promise<boolean>;
  sendSms(phone: string, text: string): Promise<boolean>;
}

class ConsoleSmsService implements ISmsService {
  async sendOtp(phone: string, code: string): Promise<boolean> {
    logger.info(
      `[CONSOLE SMS] OTP Sent to ${phone} | Code: ${code} (Expires in ${env.OTP_EXPIRY_MINUTES}m)`
    );
    return true;
  }

  async sendSms(phone: string, text: string): Promise<boolean> {
    logger.info(`[CONSOLE SMS] Notification Sent to ${phone} | Text: "${text}"`);
    return true;
  }
}

class MoolreHttpSmsService implements ISmsService {
  private vasKey: string;
  private senderId: string;

  constructor() {
    this.vasKey = env.MOOLRE_VAS_KEY || env.SMS_API_KEY || "";
    this.senderId = env.SMS_SENDER_ID || "Fides";
  }

  async sendOtp(phone: string, code: string): Promise<boolean> {
    const text = `Your Fides verification code is ${code}. Expires in ${env.OTP_EXPIRY_MINUTES} minutes. Do not share.`;
    return this.sendSms(phone, text);
  }

  async sendSms(phone: string, text: string): Promise<boolean> {
    if (!this.vasKey || this.vasKey.includes("dev")) {
      logger.warn("Moolre SMS VAS Key is not configured for production. Falling back to logger.");
      logger.info(`[MOOLRE SMS MOCK] To: ${phone} | SenderID: ${this.senderId} | Content: "${text}"`);
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
      logger.info(`[MOOLRE SMS DISPATCH RESPONSE] Status: ${response.status}`, { resData });

      return response.ok && (resData.status === 1 || resData.code === "SMS01");
    } catch (error) {
      logger.error("Failed to send SMS via Moolre Gateway:", error);
      return false;
    }
  }
}

export const smsService: ISmsService =
  env.NODE_ENV === "production" && env.SMS_PROVIDER !== "console"
    ? new MoolreHttpSmsService()
    : new ConsoleSmsService();

export const sendSms = (phone: string, text: string) =>
  smsService.sendSms(phone, text);
