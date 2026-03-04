import http from "node:http";

import next from "next";

const hostname = "0.0.0.0";
const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

const shutdown = (server, signal) => {
  console.log(`[pm2-next] ${signal} received on pid=${process.pid}, closing server`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};

app
  .prepare()
  .then(() => {
    const server = http.createServer((req, res) => handle(req, res));

    server.listen(port, hostname, () => {
      console.log(
        `[pm2-next] listening on http://${hostname}:${port} pid=${process.pid}`,
      );
    });

    process.on("SIGINT", () => shutdown(server, "SIGINT"));
    process.on("SIGTERM", () => shutdown(server, "SIGTERM"));
  })
  .catch((error) => {
    console.error("[pm2-next] failed to start", error);
    process.exit(1);
  });
