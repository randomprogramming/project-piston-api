import type BaseRouter from "./router/BaseRouter";
import express, { type Express } from "express";
import { PrismaClient } from "@prisma/client";
import { NODE_ENV, PORT } from "./env";
import logger from "./logger";
import PingRouter from "./router/PingRouter";
import { initAuthMiddleware } from "./util/auth";
import AuthRouter from "./router/AuthRouter";
import AccountRepository from "./repository/AccountRepository";
import errorHandling from "./middleware/errorHandling";

export default class Server {
    private app: Express;
    private prismaClient: PrismaClient;

    private accountRepo: AccountRepository;

    constructor() {
        this.app = express();
        this.prismaClient = new PrismaClient();

        this.accountRepo = new AccountRepository(this.prismaClient);
    }

    private setupMiddleware() {
        logger.info("Setting up middleware...");

        this.app.use(express.json());
        this.app.use(initAuthMiddleware(this.accountRepo));
    }

    private setupRouters() {
        logger.info("Setting up routers...");

        const ALL_ROUTERS: BaseRouter[] = [
            new PingRouter(),
            new AuthRouter(this.accountRepo),
        ];

        for (const router of ALL_ROUTERS) {
            logger.info(
                `Registering router with endpoint '${router.getPath()}'`
            );
            this.app.use(router.getPath(), router.getRouter());
        }
    }

    private setUpErrorHandling() {
        logger.info("Setting up error handling...");

        this.app.use(errorHandling());
    }

    private listen() {
        this.app.listen(PORT);
        logger.info(`Server started, listening on port ${PORT}`);
    }

    public run() {
        logger.info(`Starting server with NODE_ENV: '${NODE_ENV}'`);

        this.setupMiddleware();
        this.setupRouters();
        this.setUpErrorHandling();
        this.listen();
    }
}
