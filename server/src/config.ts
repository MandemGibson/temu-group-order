import dotenv from "dotenv";
dotenv.config();

export const TEMU_MIN_ORDER_GHS = Number(process.env.TEMU_MIN_ORDER_GHS || 350);
export const TEMU_MIN_ORDER_PESEWAS = Number(
  process.env.TEMU_MIN_ORDER_PESEWAS || TEMU_MIN_ORDER_GHS * 100
);
