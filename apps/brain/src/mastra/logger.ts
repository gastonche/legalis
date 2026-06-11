import pino from "pino";

/**
 * Structured logging for the brain. JSON in production (ship to any log sink);
 * pretty-printed locally. LOG_LEVEL overrides (default info; set debug to see
 * per-step tool timings).
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "legalis-brain" },
  ...(process.env.NODE_ENV === "production"
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname,service" },
        },
      }),
});
