import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import {
    GOOGLE_CALLBACK_URL,
    GOOGLE_CLIENT_ID,
    GOOGLE_SECRET,
    JWT_SECRET_KEY,
} from "../../env";
import logger from "../../logger";
import { AuthProvider } from "@prisma/client";
import AccountRepository from "../../repository/AccountRepository";
import { hideEmail } from "../email";
import { accountToJwtPayload } from "./jwt";

/**
 * Anonymous strategy is needed when you want both authenticated and non-authenticated
 * users to access some endpoint. For now we don't need it, but maybe in the future we will.
 */
// export function buildAnonymousStrategy {
//     return new AnonymousStrategy();
// }

/**
 * Build and return the JwtStrategy used for JWT authentication within the passport
 * ecosystem
 */
export function buildJwtStrategy() {
    return new JwtStrategy(
        {
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: JWT_SECRET_KEY,
        },
        (jwt_payload, done) => {
            logger.info(
                `Using provider '${AuthProvider.local}' for Account: '${
                    jwt_payload.id ?? null
                }'`
            );
            done(null, jwt_payload);
        }
    );
}

/**
 * Build and return the GoogleStrategy used for Google OAuth authentication
 * within the passport ecosystem
 */
export function buildGoogleStrategy(accountRepo: AccountRepository) {
    return new GoogleStrategy(
        {
            clientID: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_SECRET,
            callbackURL: GOOGLE_CALLBACK_URL.href,
            scope: ["email", "profile"],
        },
        async (_accessToken, _refreshToken, profile, done) => {
            logger.info(
                `Using provider '${AuthProvider.google}' for Google Account: '${profile.id}'`
            );
            let email: string | null;
            if (profile.emails?.length) {
                // TODO: Research this, maybe we need to use some specific email from the list?
                email = profile.emails[0].value;
            } else {
                logger.error(`Google account has no emails: '${profile}'`);
                return done("error");
            }

            const account = await accountRepo.findByEmailWhereProviderGoogle(
                email
            );
            if (account) {
                logger.info(
                    `Found existing account for Google Account: '${
                        profile.id
                    }' with email '${hideEmail(email)}'`
                );
                return done(null, accountToJwtPayload(account));
            }

            const createdAccount = await accountRepo.createGoogle({
                email: email,
                firstName: profile.name?.givenName || null,
                lastName: profile.name?.familyName || null,
            });
            if (!createdAccount) {
                logger.error(
                    `Failed to create local account for Google account: '${hideEmail(
                        email
                    )}'`
                );
                return done("error");
            }

            logger.info(
                `Created a new local account for Google Account: '${
                    profile.id
                }' with email '${hideEmail(email)}'`
            );
            return done(null, accountToJwtPayload(createdAccount));
        }
    );
}
