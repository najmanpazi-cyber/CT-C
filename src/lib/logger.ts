type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel = import.meta.env.PROD ? "warn" : "debug";

function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
) {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[MIN_LEVEL]) return;

  const consoleFn =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : level === "info"
          ? console.info
          : console.log;

  consoleFn(
    `[${new Date().toISOString()}] [${level.toUpperCase()}]`,
    message,
    context ?? "",
  );
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) =>
    log("debug", msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) =>
    log("info", msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) =>
    log("warn", msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) =>
    log("error", msg, ctx),
};
