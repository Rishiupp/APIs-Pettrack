import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ResponseHandler } from '../../utils/response';
import { ValidationError } from '../../types';

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const validationErrors: ValidationError[] = errors.array().map(error => ({
      field: error.type === 'field' ? (error as any).path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? (error as any).value : undefined,
    }));

    ResponseHandler.validationError(res, validationErrors);
    return;
  }

  next();
};

export const validate = (validations: ValidationChain[]) => {
  return [
    ...validations,
    handleValidationErrors,
  ];
};