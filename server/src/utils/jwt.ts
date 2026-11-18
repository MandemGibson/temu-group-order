import jwt from "jsonwebtoken";

export interface JwtPayload {
  userId: string;
  role: string;
  phone: string;
}

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-temu-group-order-key-dev";
const JWT_EXPIRES_IN = "30d";

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};
