import winston from "winston";

const timestampLog = winston.format.printf(({ level, message, timestamp }) => {
    return `[${timestamp}] ${level}: ${message}`;
});
const withTimestampFormat = winston.format.combine(
    winston.format.timestamp(),
    timestampLog
);

const logger = winston.createLogger();

logger.add(
    new winston.transports.Console({
        format: withTimestampFormat,
    })
);

export function logAction(accountId: string, msg: string) {
    logger.info(`[${accountId}] ${msg}`);
}

export default logger;
