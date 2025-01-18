import type AccountRepository from "../../repository/AccountRepository";
import passport from "passport";
import { buildGoogleStrategy, buildJwtStrategy } from "./strategy";
import bcrypt from "bcrypt";

export function initAuthMiddleware(accountRepo: AccountRepository) {
    passport.use(buildJwtStrategy());
    passport.use(buildGoogleStrategy(accountRepo));
    return passport.initialize();
}

export async function hashPass(val: string) {
    return await bcrypt.hash(val, 15);
}

export async function compareHashedPass(rawPass: string, hashedPass: string) {
    return await bcrypt.compare(rawPass, hashedPass);
}
