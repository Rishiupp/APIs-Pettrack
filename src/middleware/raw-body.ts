import { Request, Response, NextFunction } from 'express';
import { json, raw } from 'express';

/**
 * Middleware to capture raw body for webhook signature verification
 * while still parsing JSON for most requests
 */
export const rawBodyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Only apply to webhook endpoints
  if (req.path.includes('webhook')) {
    // Use raw middleware for webhooks
    return raw({ type: 'application/json' })(req, res, (err) => {
      if (err) return next(err);
      
      // Store raw body
      (req as any).rawBody = req.body;
      
      // Parse JSON manually
      try {
        req.body = JSON.parse(req.body.toString());
      } catch (parseErr) {
        return res.status(400).json({ error: 'Invalid JSON' });
      }
      
      next();
    });
  }
  
  // Use regular JSON middleware for other endpoints
  return json({ limit: '10mb' })(req, res, next);
};