export enum Environment {
    production = "production",
    staging = "staging",
    development = "development",
}
function parseNodeEnv(): Environment {
    const nodeEnv = process.env["NODE_ENV"];

    if (!nodeEnv || !Object.values<string>(Environment).includes(nodeEnv)) {
        throw new Error(
            `'${nodeEnv}' is not a valid NODE_ENV. Expected one of the following: ` +
                Object.values<string>(Environment)
        );
    }

    return nodeEnv as Environment;
}

function parseEnvInt(envName: string, required: true): number;
function parseEnvInt(envName: string, required: false): number | null;
function parseEnvInt(envName: string, required: boolean) {
    const val = process.env[envName];
    if (!val) {
        if (required) {
            throw Error(`Environment variable '${envName}' is required.`);
        }
        return null;
    }

    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) {
        if (required) {
            throw Error(`Environment variable '${envName}' is required.`);
        }
        return null;
    }

    return parsed;
}

function parseEnvString(envName: string, required: true): string;
function parseEnvString(envName: string, required: false): string | undefined;
function parseEnvString(envName: string, required: boolean) {
    const val = process.env[envName];

    if (required && (!val || val.length === 0)) {
        throw Error(`Environment variable '${envName}' is required.`);
    }
    return val;
}

function parseEnvURL(envName: string, required: true): URL;
function parseEnvURL(envName: string, required: false): URL | null;
function parseEnvURL(envName: string, required: boolean): URL | null {
    try {
        return new URL(parseEnvString(envName, true));
    } catch (e) {
        if (required) {
            throw e;
        }
        return null;
    }
}

export const NODE_ENV = parseNodeEnv();
export const PORT = parseEnvInt("PORT", false) || 8080;
export const JWT_COOKIE_NAME = parseEnvString("JWT_COOKIE_NAME", true);
export const JWT_SECRET_KEY = parseEnvString("JWT_SECRET_KEY", true);
export const GOOGLE_CLIENT_ID = parseEnvString("GOOGLE_CLIENT_ID", true);
export const GOOGLE_SECRET = parseEnvString("GOOGLE_SECRET", true);
export const GOOGLE_CALLBACK_URL = parseEnvURL("GOOGLE_CALLBACK_URL", true);
export const GOOGLE_REDIRECT_URL = parseEnvURL("GOOGLE_REDIRECT_URL", true);
export const AUCTION_IMAGE_HOST = parseEnvURL("AUCTION_IMAGE_HOST", true);
export const CLOUDINARY_API_KEY = parseEnvString("CLOUDINARY_API_KEY", true);
export const CLOUDINARY_API_SECRET = parseEnvString(
    "CLOUDINARY_API_SECRET",
    true
);
export const CLOUDINARY_CLOUD_NAME = parseEnvString(
    "CLOUDINARY_CLOUD_NAME",
    true
);
export const FEATURED_AUCTIONS_COUNT = parseEnvInt(
    "FEATURED_AUCTIONS_COUNT",
    true
);
