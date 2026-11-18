import { Response } from "express";
import { LeaderOnboardingStatus, UserRole } from "@prisma/client";
import { prisma } from "../db";
import { AuthRequest } from "../middleware/auth";

export const listLeaderApplications = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const applications = await prisma.user.findMany({
      where: {
        leaderOnboardingStatus: {
          in: [
            LeaderOnboardingStatus.pending_review,
            LeaderOnboardingStatus.approved,
            LeaderOnboardingStatus.suspended,
          ],
        },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        leaderOnboardingStatus: true,
        ghanaCardNumber: true,
        ghanaCardImageUrl: true,
        selfieImageUrl: true,
        leaderApprovedAt: true,
        leaderSuspendedAt: true,
        leaderSuspendedReason: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ applications, count: applications.length });
  } catch (error) {
    console.error("Error in listLeaderApplications:", error);
    res.status(500).json({ error: "Failed to list leader applications" });
  }
};

export const approveLeader = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const leaderId = String(req.params.id);

    const user = await prisma.user.findUnique({
      where: { id: leaderId },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: leaderId },
      data: {
        role: UserRole.leader,
        leaderOnboardingStatus: LeaderOnboardingStatus.approved,
        leaderApprovedAt: new Date(),
        leaderSuspendedAt: null,
        leaderSuspendedReason: null,
      },
    });

    res.status(200).json({
      message: "Leader application approved successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error in approveLeader:", error);
    res.status(500).json({ error: "Failed to approve leader application" });
  }
};

export const suspendLeader = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const leaderId = String(req.params.id);
    const { reason } = req.body;

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      res.status(400).json({ error: "Suspension reason is required" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: leaderId },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: leaderId },
      data: {
        leaderOnboardingStatus: LeaderOnboardingStatus.suspended,
        leaderSuspendedAt: new Date(),
        leaderSuspendedReason: reason.trim(),
      },
    });

    res.status(200).json({
      message: "Leader suspended successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error in suspendLeader:", error);
    res.status(500).json({ error: "Failed to suspend leader" });
  }
};
