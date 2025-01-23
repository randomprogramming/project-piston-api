import type { Account } from "@prisma/client";
import { InvalidJwtPayload } from "./exception";
import json from "jsonwebtoken";
import { JWT_SECRET_KEY } from "../../env";

/**
 * Matches Account database schema
 */
export interface JWTPayload {
    id: string;
    email: string;
    username: string | null;
}
export function isValidJWTPayload(obj: any): obj is JWTPayload {
    if (typeof obj.id !== "string" || obj.id.length <= 0) {
        return false;
    }
    if (typeof obj.email !== "string" || obj.email.length <= 0) {
        return false;
    }

    return true;
}

export function accountToJwtPayload(account: Account): JWTPayload {
    return {
        id: account.id,
        username: account.username,
        email: account.email,
    };
}

export function generateJWT(payload: any) {
    if (!isValidJWTPayload(payload)) {
        throw new InvalidJwtPayload(payload);
    }

    return json.sign(
        {
            id: payload.id,
            username: payload.username,
            email: payload.email,
        },
        JWT_SECRET_KEY
    );
}
