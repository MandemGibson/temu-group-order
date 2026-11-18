"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const validate = (schema) => {
    return async (req, res, next) => {
        try {
            if (schema.body) {
                req.body = await schema.body.parseAsync(req.body);
            }
            if (schema.query) {
                req.query = (await schema.query.parseAsync(req.query));
            }
            if (schema.params) {
                req.params = (await schema.params.parseAsync(req.params));
            }
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const formattedErrors = error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                    code: issue.code,
                }));
                res.status(400).json({
                    error: "Validation Error",
                    message: formattedErrors[0]?.message || "Invalid request payload",
                    details: formattedErrors,
                });
                return;
            }
            next(error);
        }
    };
};
exports.validate = validate;
