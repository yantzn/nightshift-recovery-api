import { Router } from "express";

import { logController } from "../controllers/logController";
import { UnauthorizedError } from "../utils/errors";

const router = Router();

const requireAuthUserId = (userId: string | undefined): string => {
  if (!userId) {
    throw new UnauthorizedError("Authenticated user is missing");
  }

  return userId;
};

router.post("/:shiftId/logs", async (req, res, next) => {
  try {
    const authenticatedUserId = requireAuthUserId(req.auth?.userId);
    const result = await logController.createSleepLog(
      req.params.shiftId,
      JSON.stringify(req.body),
      authenticatedUserId
    );

    res.status(result.statusCode).type("application/json").send(result.body);
  } catch (error) {
    next(error);
  }
});

router.get("/:shiftId/logs", async (req, res, next) => {
  try {
    const authenticatedUserId = requireAuthUserId(req.auth?.userId);
    const result = await logController.listSleepLogs(req.params.shiftId, authenticatedUserId);

    res.status(result.statusCode).type("application/json").send(result.body);
  } catch (error) {
    next(error);
  }
});

export default router;
