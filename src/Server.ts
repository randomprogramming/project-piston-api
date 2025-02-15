import type BaseRouter from "./router/BaseRouter";
import type { ImageStorage } from "./imagestorage/ImageStorage";
import express, { type Express, type Request } from "express";
import cors from "cors";
import morgan from "morgan";
import { PrismaClient } from "@prisma/client";
import { Environment, NODE_ENV, PORT } from "./env";
import logger from "./logger";
import PingRouter from "./router/PingRouter";
import { initAuthMiddleware } from "./util/auth";
import AuthRouter from "./router/AuthRouter";
import AccountRepository from "./repository/AccountRepository";
import errorHandling from "./middleware/errorHandling";
import AuctionRouter from "./router/AuctionRouter";
import AuctionRepository from "./repository/AuctionRepository";
import LocalImageStorageService from "./imagestorage/LocalImageStorage";
import MediaRepository from "./repository/MediaRepository";
import CloudinaryService from "./service/CloudinaryService";
import http from "http";
import AuctionWebSocketService from "./service/ws/AuctionWebSocketService";
import BidRepository from "./repository/BidRepository";
import BidService from "./service/BidService";
import BidRouter from "./router/BidRouter";
import AuctionService from "./service/AuctionService";
import AuctionRepository2 from "./repository/AuctionRepository2";

export default class Server {
    private app: Express;
    private httpServer: http.Server;
    private prismaClient: PrismaClient;

    private accountRepo: AccountRepository;
    private auctionRepo: AuctionRepository;
    // TODO: Replace auctionRepo with Auctionrepo2
    private auctionRepo2: AuctionRepository2;
    private mediaRepo: MediaRepository;
    private bidRepo: BidRepository;

    private imageStorage: ImageStorage;
    private cloudinaryService: CloudinaryService;
    private auctionWebSocketService: AuctionWebSocketService;
    private bidService: BidService;
    private auctionService: AuctionService;

    constructor() {
        this.app = express();
        this.httpServer = http.createServer(this.app);
        this.prismaClient = new PrismaClient({
            transactionOptions: {
                timeout: 20000,
                maxWait: 20000,
            },
        });

        this.accountRepo = new AccountRepository(this.prismaClient);
        this.auctionRepo = new AuctionRepository(this.prismaClient);
        this.auctionRepo2 = new AuctionRepository2(this.prismaClient);
        this.mediaRepo = new MediaRepository(this.prismaClient);
        this.bidRepo = new BidRepository(this.prismaClient);

        this.imageStorage = new LocalImageStorageService("/images/auctions");
        this.cloudinaryService = new CloudinaryService();
        this.auctionWebSocketService = new AuctionWebSocketService(
            this.httpServer
        );
        this.bidService = new BidService(this.bidRepo, this.auctionRepo2);
        this.auctionService = new AuctionService(
            this.auctionRepo,
            this.auctionRepo2
        );
    }

    private setupMiddleware() {
        logger.info("Setting up middleware...");

        morgan.token("userId", function (req: Request) {
            return req.user ? req.user.id : "-";
        });
        this.app.use(
            morgan("[:userId] :method :url :status - :response-time \bms", {
                stream: {
                    write: (msg) => {
                        // Use winston for logging
                        logger.info(msg.trimEnd());
                    },
                },
            })
        );
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(initAuthMiddleware(this.accountRepo));
    }

    private setupRouters() {
        logger.info("Setting up routers...");

        const ALL_ROUTERS: BaseRouter[] = [
            new PingRouter(),
            new AuthRouter(this.accountRepo),
            new AuctionRouter(
                this.auctionService,
                this.auctionRepo,
                this.mediaRepo,
                this.imageStorage,
                this.cloudinaryService
            ),
            new BidRouter(this.bidService, this.auctionWebSocketService),
        ];

        for (const router of ALL_ROUTERS) {
            logger.info(
                `Registering router with endpoint '${router.getPath()}'`
            );
            this.app.use(router.getPath(), router.getRouter());
        }
        if (NODE_ENV === Environment.development) {
            logger.warn("Exposing static files from ./public folder");
            this.app.use("/", express.static("./public"));
        }
    }

    private setUpErrorHandling() {
        logger.info("Setting up error handling...");

        this.app.use(errorHandling());
    }

    private listen() {
        this.httpServer.listen(PORT);
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
