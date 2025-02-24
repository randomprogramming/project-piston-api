import type AccountRepository from "../../repository/AccountRepository";
import passport from "passport";
import { buildGoogleStrategy, buildJwtStrategy } from "./strategy";

export function initAuthMiddleware(accountRepo: AccountRepository) {
    passport.use(buildJwtStrategy());
    passport.use(buildGoogleStrategy(accountRepo));
    return passport.initialize();
}

export async function hashPass(val: string) {
    return Bun.password.hash(val, {
        algorithm: "bcrypt",
        cost: 14,
    });
}

export async function compareHashedPass(password: string, hash: string) {
    return Bun.password.verify(password, hash);
}
