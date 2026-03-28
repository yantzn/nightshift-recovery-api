import { createApp } from "../app";
import { ENV } from "../config/env";
import { initSecrets } from "../config/secretsBootstrap";
import { rootLogger } from "../utils/logger";

const start = async (): Promise<void> => {
  await initSecrets();

  const app = createApp();
  const port = ENV.port;

  app.listen(port, () => {
    rootLogger.info(
      {
        event: "server.started",
        port
      },
      `Local API server running at http://localhost:${port}`
    );
  });
};

start().catch((err: unknown) => {
  rootLogger.error({ err, event: "server.start.failed" }, "Failed to start server");
  process.exit(1);
});
