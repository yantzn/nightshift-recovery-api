import serverlessExpress from "@vendia/serverless-express";
import type { APIGatewayProxyEvent, Callback, Context } from "aws-lambda";

import { createApp } from "../app";
import { initSecrets } from "../config/secretsBootstrap";

let cachedServer: ReturnType<typeof serverlessExpress> | undefined;

const getServer = async (): Promise<ReturnType<typeof serverlessExpress>> => {
  if (!cachedServer) {
    await initSecrets();
    const app = createApp();
    cachedServer = serverlessExpress({ app });
  }

  return cachedServer;
};

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
  const server = await getServer();
  return server(event, context, callback);
};
