import type { Request, Response, NextFunction } from "express";
import type { AuthenticateOptionsGoogle } from "passport-google-oauth20";
import passport from "passport";
import { AuthProvider, Role } from "@prisma/client";
import { RequestNoUser } from "./exception";
import HttpStatus from "../../HttpStatus";
import ResponseErrorMessageBuilder from "../../router/response/ResponseErrorMessageBuilder";

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

// TODO: There is a problem where after changing the users role in the database, the change won't be actually reflected
// to the user, because the role is saved in their JWT token
// Maybe we need to look into keeping a list of "blacklisted" tokens in a cache if we will be changing roles often?
/**
 * Middleware which checks if a user holds a specific role, reading it from the JWT.
 * Also includes the auth() middleware so you don't have to use it in your route
 */
export function hasRole(r: Role) {
    return [
        auth(),
        (req: Request, res: Response, next: NextFunction) => {
            if (req.user?.role !== r) {
                res.status(HttpStatus.Unauthorized).send();
                return;
            }
            next();
        },
    ];
}

export function hasAdminRole() {
    return hasRole(Role.ADMIN);
}

// TODO: Use this everywhere where it needs to be used!!
export function hasUsername() {
    return [
        auth(),
        (req: Request, res: Response, next: NextFunction) => {
            if (!req.user?.username || req.user?.username.length === 0) {
                return ResponseErrorMessageBuilder.account()
                    .addDetail("username", "missing")
                    .send(res, HttpStatus.Unauthorized);
            }
            next();
        },
    ];
}
