import { Router } from "express";

import { scoreController } from "../controllers/scoreController";
import { UnauthorizedError } from "../utils/errors";

const router = Router();

const requireAuthUserId = (userId: string | undefined): string => {
  if (!userId) {
    throw new UnauthorizedError("Authenticated user is missing");
  }

  return userId;
};

router.get("/:shiftId/score", async (req, res, next) => {
  try {
    const authenticatedUserId = requireAuthUserId(req.auth?.userId);
    const result = await scoreController.getRecoveryScore(req.params.shiftId, authenticatedUserId);

    res.status(result.statusCode).type("application/json").send(result.body);
  } catch (error) {
    next(error);
  }
});

export default router;
