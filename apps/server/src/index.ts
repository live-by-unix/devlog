import { boot } from "./app.js";
import { config } from "./config.js";

const { app, logger } = await boot();

const server = app.listen(config.port, config.host, () => {
  logger.info("Devlog server listening", { host: config.host, port: config.port, env: config.env });
});

function shutdown(signal: string) {
  logger.info("shutting down", { signal });
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (err) => {
  logger.error("unhandled rejection", { err: String(err) });
});
process.on("uncaughtException", (err) => {
  logger.error("uncaught exception", { err: String(err) });
  process.exit(1);
});
