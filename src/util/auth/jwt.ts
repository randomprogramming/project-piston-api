import type { Account, Role } from "@prisma/client";
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
    role: Role;
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
        role: account.role,
    };
}

export function generateJWT(payload: any) {
    if (!isValidJWTPayload(payload)) {
        throw new InvalidJwtPayload(payload);
    }
    const payloadCast: JWTPayload = {
        id: payload.id,
        username: payload.username,
        email: payload.email,
        role: payload.role,
    };
    return json.sign(payloadCast, JWT_SECRET_KEY);
}
