import type { NextFunction, Request, Response } from "express";

import { verifyJwtToken } from "../utils/auth";

export const authMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authorization = req.header("authorization") ?? req.header("Authorization");
    const authContext = verifyJwtToken(authorization);

    req.auth = authContext;
    next();
  } catch (error) {
    next(error);
  }
};
