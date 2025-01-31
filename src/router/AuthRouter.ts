import type { Request, Response } from "express";
import type { Account } from "@prisma/client";
import type AccountRepository from "../repository/AccountRepository";
import type CloudinaryService from "../service/CloudinaryService";
import { parseLoginBody, parseRegisterBody } from "../dto/account";
import logger from "../logger";
import { compareHashedPass, hashPass } from "../util/auth";
import { hideEmail } from "../util/email";
import BaseRouter, { API_VERSION } from "./BaseRouter";
import { serializeCookie } from "../util/cookie";
import { GOOGLE_REDIRECT_URL, JWT_COOKIE_NAME } from "../env";
import { auth, googleAuth } from "../util/auth/middleware";
import { generateJWT } from "../util/auth/jwt";
import ResponseErrorMessageBuilder from "./response/ResponseErrorMessageBuilder";
import HttpStatus from "../HttpStatus";

export default class AuthRouter extends BaseRouter {
    constructor(
        private accountRepo: AccountRepository,
        private cloudinaryService: CloudinaryService
    ) {
        super(API_VERSION.V1, "/auth");

        this.router.get("/google", googleAuth({})); // Step 1 of Google OAuth
        this.router.get(
            "/google/callback",
            googleAuth({
                failureRedirect: "/login",
                failureMessage: true,
            }),
            this.handleGoogleCallback // Step 2 of Google OAuth
        );
        this.router.post("/register", this.register);
        this.router.post("/login", this.login);
        this.router.get("/me", auth(), this.getMe);
        this.router.post("/cloudinary", auth(), this.authenticateCloudinary);
    }

    public handleGoogleCallback = async (req: Request, res: Response) => {
        const accessToken = generateJWT(req.user);
        res.setHeader(
            "Set-Cookie",
            serializeCookie(JWT_COOKIE_NAME, accessToken, {
                sameSite: "Lax",
                path: "/",
                secure: true,
                maxAge: 60 * 60 * 24 * 30,
                domain: "." + GOOGLE_REDIRECT_URL.hostname.replace("www.", ""),
            })
        );

        res.redirect(GOOGLE_REDIRECT_URL.href);
    };

    public register = async (req: Request, res: Response) => {
        const registerBody = parseRegisterBody(req.body);
        logger.info(
            `Creating account with email '${hideEmail(registerBody.email)}'`
        );

        const hashedPass = await hashPass(registerBody.password);
        // @ts-ignore: Deleting password to make 100% sure we don't accidentaly log or use it somewhere..
        delete registerBody.password;

        const existsByEmail =
            await this.accountRepo.existsByEmailCaseInsensitive(
                registerBody.email
            );
        if (existsByEmail) {
            return ResponseErrorMessageBuilder.account()
                .addDetail("email", "exists")
                .send(res);
        }

        await this.accountRepo.createLocal(registerBody, hashedPass);
        res.status(HttpStatus.Created).send();
    };

    public login = async (req: Request, res: Response) => {
        const { handle, password } = parseLoginBody(req.body);
        let account: Account | null = null;

        if (handle.includes("@")) {
            account =
                await this.accountRepo.findByEmailCaseInsensitiveWhereProviderLocal(
                    handle
                );
            if (!account) {
                return ResponseErrorMessageBuilder.account()
                    .addDetail("email", "not_found")
                    .log("login", `Email not found '${hideEmail(handle)}'`)
                    .send(res);
            }
        } else {
            account = await this.accountRepo.findByUsernameWhereProviderLocal(
                handle
            );
            if (!account) {
                return ResponseErrorMessageBuilder.account()
                    .addDetail("username", "not_found")
                    .log("login", `Username not found '${handle}'`)
                    .send(res);
            }
        }

        // TODO: Account activation, remember only local accounts need activation, google accounts do not.
        // if (!account.activated || account.activationToken) {
        // }

        const compareResult = await compareHashedPass(
            password,
            account.password!
        );

        if (!compareResult) {
            const logHandle = handle.includes("@") ? hideEmail(handle) : handle;
            return ResponseErrorMessageBuilder.account()
                .addDetail("email", "not_found") // Tell the user the account is not found when password is wrong, to avoid email attacks
                .log("login", `Invalid password for '${logHandle}'`)
                .send(res);
        }

        const accessToken = generateJWT(account);
        res.json({
            accessToken,
        });
    };

    public getMe = (req: Request, res: Response) => {
        res.json(req.user);
    };

    public authenticateCloudinary = async (_req: Request, res: Response) => {
        // TODO: move this entire endpoint to the auctionRouter so that we can verify that uploading for that auction is allowed
        // (is in state PENDING_CHANGES and has less than 200 images)
        const resp = this.cloudinaryService.authenticateCloudinary();

        res.json(resp);
    };
}
