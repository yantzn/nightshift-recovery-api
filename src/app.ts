import "./config/env";

import express from "express";
import helmet from "helmet";

import { authMiddleware } from "./middleware/authMiddleware";
import { errorMiddleware } from "./middleware/errorMiddleware";
import { loggerMiddleware } from "./middleware/loggerMiddleware";
import { requestContextMiddleware } from "./middleware/requestContextMiddleware";
import healthRoutes from "./routes/healthRoutes";
import logRoutes from "./routes/logRoutes";
import planRoutes from "./routes/planRoutes";
import scoreRoutes from "./routes/scoreRoutes";
import shiftRoutes from "./routes/shiftRoutes";

export const createApp = (): express.Express => {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));

  app.use(requestContextMiddleware);
  app.use(loggerMiddleware);

  app.use("/health", healthRoutes);

  app.use(authMiddleware);
  app.use("/shifts", shiftRoutes);
  app.use("/shifts", planRoutes);
  app.use("/shifts", logRoutes);
  app.use("/shifts", scoreRoutes);

  app.use(errorMiddleware);

  return app;
};
