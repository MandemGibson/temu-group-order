import { Request, Response } from "express";
import { otpStore } from "../services/otp.store";
import { smsService } from "../services/sms.service";
import { prisma } from "../db";
import { generateToken } from "../utils/jwt";
import { AuthRequest } from "../middleware/auth";

export const requestOtp = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { phone } = req.body;
    if (!phone || typeof phone !== "string") {
      res.status(400).json({ error: "Phone number is required" });
      return;
    }

    const normalized = otpStore.normalizePhone(phone);
    const { allowed, waitSeconds } = otpStore.canRequestOtp(normalized);

    if (!allowed) {
      res.status(429).json({
        error: `Please wait ${waitSeconds} seconds before requesting another OTP.`,
        waitSeconds,
      });
      return;
    }

    const code = otpStore.generateOtp(normalized);
    await smsService.sendOtp(normalized, code);

    const isDev = process.env.NODE_ENV === "development";
    res.status(200).json({
      message: "OTP sent successfully",
      phone: normalized,
      ...(isDev && {
        devCode: code,
        note: "devCode returned for local testing convenience",
      }),
    });
  } catch (error) {
    console.error("Error in requestOtp:", error);
    res.status(500).json({ error: "Failed to request OTP" });
  }
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, code, name } = req.body;
    if (!phone || !code) {
      res.status(400).json({ error: "Phone number and OTP code are required" });
      return;
    }

    const normalized = otpStore.normalizePhone(phone);
    const result = otpStore.verifyOtp(normalized, String(code));

    if (!result.valid) {
      res.status(400).json({ error: result.reason || "Invalid OTP" });
      return;
    }

    // Find or create user record
    let user = await prisma.user.findUnique({
      where: { phone: normalized },
    });

    if (!user) {
      const defaultName =
        name && typeof name === "string" && name.trim().length > 0
          ? name.trim()
          : `Buyer_${normalized.slice(-4)}`;

      user = await prisma.user.create({
        data: {
          phone: normalized,
          name: defaultName,
          phoneVerifiedAt: new Date(),
        },
      });
    } else if (!user.phoneVerifiedAt) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { phoneVerifiedAt: new Date() },
      });
    }

    const token = generateToken({
      userId: user.id,
      role: user.role,
      phone: user.phone,
    });

    res.status(200).json({
      message: "Authentication successful",
      token,
      user,
    });
  } catch (error) {
    console.error("Error in verifyOtp:", error);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    res.status(200).json({ user: req.user });
  } catch (error) {
    console.error("Error in getMe:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

export const submitLeaderApplication = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { ghanaCardNumber, selfieImageUrl } = req.body;

    const updatedUser = await prisma.user.update({
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
  } catch (error) {
    console.error("Error in submitLeaderApplication:", error);
    res.status(500).json({ error: "Failed to submit leader application" });
  }
};
