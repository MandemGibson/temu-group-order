"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSuperAdmin = exports.requireAdmin = exports.requireLeader = exports.requireRoles = exports.requireAuth = void 0;
const client_1 = require("@prisma/client");
const jwt_1 = require("../utils/jwt");
const db_1 = require("../db");
const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res
                .status(401)
                .json({ error: "Unauthorized: Missing or invalid token format" });
            return;
        }
        const token = authHeader.split(" ")[1];
        const decoded = (0, jwt_1.verifyToken)(token);
        const user = await db_1.prisma.user.findUnique({
            where: { id: decoded.userId },
        });
        if (!user) {
            res.status(401).json({ error: "Unauthorized: User no longer exists" });
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        res
            .status(401)
            .json({ error: "Unauthorized: Invalid or expired session token" });
        return;
    }
};
exports.requireAuth = requireAuth;
/**
 * Generic middleware factory to check if the authenticated user has any of the required roles.
 */
const requireRoles = (...allowedRoles) => {
    return (req, res, next) => {
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
exports.requireRoles = requireRoles;
/**
 * Leader access middleware (leader, admin, or super_admin)
 */
const requireLeader = (req, res, next) => {
    return (0, exports.requireRoles)(client_1.UserRole.leader, client_1.UserRole.admin, client_1.UserRole.super_admin)(req, res, next);
};
exports.requireLeader = requireLeader;
/**
 * Admin access middleware (admin or super_admin)
 */
const requireAdmin = (req, res, next) => {
    return (0, exports.requireRoles)(client_1.UserRole.admin, client_1.UserRole.super_admin)(req, res, next);
};
exports.requireAdmin = requireAdmin;
/**
 * Super Admin access middleware (super_admin only)
 */
const requireSuperAdmin = (req, res, next) => {
    return (0, exports.requireRoles)(client_1.UserRole.super_admin)(req, res, next);
};
exports.requireSuperAdmin = requireSuperAdmin;
