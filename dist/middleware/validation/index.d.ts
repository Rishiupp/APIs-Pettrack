import { Request, Response, NextFunction } from 'express';
import { ValidationChain } from 'express-validator';
export declare const handleValidationErrors: (req: Request, res: Response, next: NextFunction) => void;
export declare const validate: (validations: ValidationChain[]) => (((req: Request, res: Response, next: NextFunction) => void) | ValidationChain)[];
//# sourceMappingURL=index.d.ts.map