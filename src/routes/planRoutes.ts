import { Router } from "express";

import { planController } from "../controllers/planController";
import { UnauthorizedError } from "../utils/errors";

const router = Router();

const requireAuthUserId = (userId: string | undefined): string => {
  if (!userId) {
    throw new UnauthorizedError("Authenticated user is missing");
  }

  return userId;
};

router.get("/:shiftId/plan", async (req, res, next) => {
  try {
    const authenticatedUserId = requireAuthUserId(req.auth?.userId);
    const result = await planController.getPlan(req.params.shiftId, authenticatedUserId);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
