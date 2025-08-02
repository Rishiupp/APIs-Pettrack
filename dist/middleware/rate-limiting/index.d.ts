export declare const defaultRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const strictRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const otpRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const qrScanRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const paymentRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const createRoleBasedRateLimit: (limits: {
    [key: string]: {
        windowMs: number;
        max: number;
    };
}) => import("express-rate-limit").RateLimitRequestHandler;
//# sourceMappingURL=index.d.ts.map