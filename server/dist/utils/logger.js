"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const isProduction = process.env.NODE_ENV === "production";
const logDir = path_1.default.join(process.cwd(), "logs");
// Safely ensure log directory exists if file logging is used
try {
    if (!fs_1.default.existsSync(logDir)) {
        fs_1.default.mkdirSync(logDir, { recursive: true });
    }
}
catch {
    // If running in a read-only container, file logging falls back gracefully
}
// 12-factor standard structured JSON format for Cloud / Production
const productionConsoleFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
// Human-friendly colored format for Local Development
const devConsoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: "HH:mm:ss" }), winston_1.default.format.printf(({ level, message, timestamp, stack }) => {
    return stack
        ? `[${timestamp}] ${level}: ${message}\n${stack}`
        : `[${timestamp}] ${level}: ${message}`;
}));
const transports = [
    new winston_1.default.transports.Console({
        format: isProduction ? productionConsoleFormat : devConsoleFormat,
    }),
];
// Add file transports when filesystem is writable
try {
    transports.push(new winston_1.default.transports.File({
        filename: path_1.default.join(logDir, "error.log"),
        level: "error",
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    }), new winston_1.default.transports.File({
        filename: path_1.default.join(logDir, "combined.log"),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    }));
}
catch {
    // Graceful fallback to console
}
exports.logger = winston_1.default.createLogger({
    level: isProduction ? "info" : "debug",
    defaultMeta: { service: "fides-backend" },
    transports,
});
