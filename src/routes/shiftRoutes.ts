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

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const authenticatedUserId = requireAuthUserId(req.auth?.userId);

    const result = await shiftController.listShifts(
      {
        userId: typeof req.query.userId === "string" ? req.query.userId : undefined
      },
      authenticatedUserId
    );

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/:shiftId", async (req, res, next) => {
  try {
    const authenticatedUserId = requireAuthUserId(req.auth?.userId);
    const result = await shiftController.getShift(req.params.shiftId, authenticatedUserId);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
