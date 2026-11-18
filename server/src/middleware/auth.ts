import { Request, Response, NextFunction } from "express";
import { User, UserRole } from "@prisma/client";
import { verifyToken } from "../utils/jwt";
import { prisma } from "../db";

export interface AuthRequest extends Request {
  user?: User;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res
        .status(401)
        .json({ error: "Unauthorized: Missing or invalid token format" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      res.status(401).json({ error: "Unauthorized: User no longer exists" });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res
      .status(401)
      .json({ error: "Unauthorized: Invalid or expired session token" });
    return;
  }
};

/**
 * Generic middleware factory to check if the authenticated user has any of the required roles.
 */
export const requireRoles = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized: Auth required" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: Requires one of [${allowedRoles.join(", ")}] roles.`,
      });
      return;
    }

    next();
  };
};

/**
 * Leader access middleware (leader, admin, or super_admin)
 */
export const requireLeader = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  return requireRoles(UserRole.leader, UserRole.admin, UserRole.super_admin)(
    req,
    res,
    next,
  );
};

/**
 * Admin access middleware (admin or super_admin)
 */
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  return requireRoles(UserRole.admin, UserRole.super_admin)(req, res, next);
};

/**
 * Super Admin access middleware (super_admin only)
 */
export const requireSuperAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  return requireRoles(UserRole.super_admin)(req, res, next);
};
