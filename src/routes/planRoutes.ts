import { Router } from "express";

import { shiftController } from "../controllers/shiftController";
import { UnauthorizedError } from "../utils/errors";

const router = Router();

const requireAuthUserId = (userId: string | undefined): string => {
  if (!userId) {
    throw new UnauthorizedError("Authenticated user is missing");
  }

  return userId;
};

router.post("/", async (req, res, next) => {
  try {
    const authenticatedUserId = requireAuthUserId(req.auth?.userId);
    const result = await shiftController.createShift(JSON.stringify(req.body), authenticatedUserId);

    res.status(result.statusCode).type("application/json").send(result.body);
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const authenticatedUserId = requireAuthUserId(req.auth?.userId);
    const queryParams: Record<string, string | undefined> = {
      userId: typeof req.query.userId === "string" ? req.query.userId : undefined
    };

    const result = await shiftController.listShifts(queryParams, authenticatedUserId);

    res.status(result.statusCode).type("application/json").send(result.body);
  } catch (error) {
    next(error);
  }
});

router.get("/:shiftId", async (req, res, next) => {
  try {
    const authenticatedUserId = requireAuthUserId(req.auth?.userId);
    const result = await shiftController.getShift(req.params.shiftId, authenticatedUserId);

    res.status(result.statusCode).type("application/json").send(result.body);
  } catch (error) {
    next(error);
  }
});

export default router;
