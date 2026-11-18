import rateLimit from "express-rate-limit";

// Rate Limiter for OTP Generation Endpoint (Prevents SMS Pumping Attacks)
export const otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Limit each IP / phone request to 5 OTPs per 10 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many OTP verification requests. Please wait 10 minutes before trying again.",
  },
});

// General API Rate Limiter
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests from this IP. Please try again later.",
  },
});

// Webhook Rate Limiter for Moolre payment gateway callbacks
export const webhookRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit to 60 callbacks per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Webhook request limit exceeded.",
  },
});
