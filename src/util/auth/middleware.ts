import type { Request, Response, NextFunction } from "express";
import type { AuthenticateOptionsGoogle } from "passport-google-oauth20";
import passport from "passport";
import { AuthProvider, Role } from "@prisma/client";
import { RequestNoUser } from "./exception";
import HttpStatus from "../../HttpStatus";

/**
 * Do not use this! This is exclusively used for initial authentication with Google OAuth.
 * If you want to protect an endpoint with authentication, use the `auth()` middleware
 */
export function googleAuth(opts: AuthenticateOptionsGoogle) {
    return passport.authenticate(AuthProvider.google, {
        ...opts,
        session: false,
    });
}

/**
 * Authentication middleware which reads the JWT token from the `Authorization` header
 * `Authorization: Bearer <token>`
 */
export function auth() {
    return [
        passport.authenticate("jwt", { session: false }),
        (req: Request, _res: Response, next: NextFunction) => {
            if (!req.user) throw new RequestNoUser(req);
            next();
        },
    ];
}

export function hasRole(r: Role) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (req.user?.role !== r) {
            res.status(HttpStatus.Unauthorized).send();
            return;
        }
        next();
    };
}

export function hasAdminRole() {
    return hasRole(Role.ADMIN);
}
