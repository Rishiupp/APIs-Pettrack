export declare const config: {
    app: {
        name: string;
        version: string;
        port: number;
        env: string;
    };
    database: {
        url: string;
    };
    jwt: {
        secret: string;
        expiresIn: string;
        refreshExpiresIn: string;
    };
    otp: {
        expiryTime: number;
        maxAttempts: number;
    };
    razorpay: {
        keyId: string;
        keySecret: string;
        webhookSecret: string;
    };
    firebase: {
        projectId: string;
        privateKey: string;
        clientEmail: string;
    };
    email: {
        host: string;
        port: number;
        user: string;
        pass: string;
    };
    sms: {
        apiKey: string | undefined;
        senderId: string;
    };
    upload: {
        maxFileSize: number;
        allowedImageTypes: string[];
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
    redis: {
        url: string;
    };
    qr: {
        baseUrl: string;
        size: number;
        errorCorrection: string;
    };
    security: {
        bcryptRounds: number;
        corsOrigin: string;
    };
    googleMaps: {
        apiKey: string | undefined;
    };
    logging: {
        level: string;
        filePath: string;
    };
};
//# sourceMappingURL=index.d.ts.map