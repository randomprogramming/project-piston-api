import winston from "winston";
import "winston-daily-rotate-file";

const timestampLog = winston.format.printf(({ level, message, timestamp }) => {
    return `[${timestamp}] ${level}: ${message}`;
});
const withTimestampFormat = winston.format.combine(
    winston.format.timestamp(),
    timestampLog
);

const logger = winston.createLogger();

const fileTransport = new winston.transports.DailyRotateFile({
    filename: "logs/application-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "7d",
    format: withTimestampFormat,
});

const errorFileTransport = new winston.transports.DailyRotateFile({
    filename: "logs/errors-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "7d",
    level: "error",
    format: withTimestampFormat,
});

const consoleTransport = new winston.transports.Console({
    format: withTimestampFormat,
});

logger.add(consoleTransport);
logger.add(fileTransport);
logger.add(errorFileTransport);

// TODO: use this
export function logAction(accountId: string, msg: string) {
    logger.info(`[${accountId}] ${msg}`);
}

export default logger;
