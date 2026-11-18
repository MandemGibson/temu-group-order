"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEMU_MIN_ORDER_PESEWAS = exports.TEMU_MIN_ORDER_GHS = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.TEMU_MIN_ORDER_GHS = Number(process.env.TEMU_MIN_ORDER_GHS || 350);
exports.TEMU_MIN_ORDER_PESEWAS = Number(process.env.TEMU_MIN_ORDER_PESEWAS || exports.TEMU_MIN_ORDER_GHS * 100);
