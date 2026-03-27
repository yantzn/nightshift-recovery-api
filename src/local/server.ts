import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 3000);

const server = createServer((req, res) => {
  const responseBody = {
    message: "nightshift-recovery-api local server is running",
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
  };

  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
  });

  res.end(JSON.stringify(responseBody));
});

server.listen(port, () => {
  console.log(`Local server started on port ${port}`);
});
