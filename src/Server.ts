import type BaseRouter from "./router/BaseRouter";
import type { ImageStorage } from "./imagestorage/ImageStorage";
import type IPubSubService from "./service/pubsub/IPubSubService";
import express, { type Express, type Request } from "express";
import cors from "cors";
import morgan from "morgan";
import { PrismaClient } from "@prisma/client";
import { NODE_ENV, PORT } from "./env";
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
import BidRepository from "./repository/BidRepository";
import BidService from "./service/BidService";
import BidRouter from "./router/BidRouter";
import AuctionService from "./service/AuctionService";
import AuctionRepository2 from "./repository/AuctionRepository2";
import LocationRepository from "./repository/LocationRepository";
import LocationRouter from "./router/LocationRouter";
import WebSocketManager from "./service/ws/WebSocketManager";
import CommentRepository from "./repository/CommentRepository";
import CommentRouter from "./router/CommentRouter";
import BrandRepository from "./repository/BrandRepository";
import BrandRouter from "./router/BrandRouter";
import ConversationRepository from "./repository/ConversationRepository";
import ConversationService from "./service/ConversationService";
import ConversationRouter from "./router/ConversationRouter";
import helmet from "helmet";
import RedisPubSubService from "./service/pubsub/RedisPubSubService";
import AccountService from "./service/AccountService";
import AccountRouter from "./router/AccountRouter";

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
    private locationRepo: LocationRepository;
    private commentRepo: CommentRepository;
    private brandRepo: BrandRepository;
    private conversationRepo: ConversationRepository;

    private pubSubService: IPubSubService;
    private imageStorage: ImageStorage;
    private cloudinaryService: CloudinaryService;
    private websocketManager: WebSocketManager;
    private bidService: BidService;
    private auctionService: AuctionService;
    private conversationService: ConversationService;
    private accountService: AccountService;

    constructor() {
        this.app = express();
        this.httpServer = http.createServer(this.app);
        this.prismaClient = new PrismaClient();

        this.accountRepo = new AccountRepository(this.prismaClient);
        this.auctionRepo = new AuctionRepository(this.prismaClient);
        this.auctionRepo2 = new AuctionRepository2(this.prismaClient);
        this.mediaRepo = new MediaRepository(this.prismaClient);
        this.bidRepo = new BidRepository(this.prismaClient);
        this.locationRepo = new LocationRepository(this.prismaClient);
        this.commentRepo = new CommentRepository(this.prismaClient);
        this.brandRepo = new BrandRepository(this.prismaClient);
        this.conversationRepo = new ConversationRepository(this.prismaClient);

        this.pubSubService = new RedisPubSubService();
        this.imageStorage = new LocalImageStorageService("/images/auctions");
        this.cloudinaryService = new CloudinaryService();
        this.websocketManager = new WebSocketManager(
            this.httpServer,
            this.pubSubService
        );
        this.bidService = new BidService(this.bidRepo, null!);
        this.auctionService = new AuctionService(
            this.auctionRepo2,
            this.mediaRepo,
            this.bidService
        );
        this.bidService.setAuctionService(this.auctionService);
        this.conversationService = new ConversationService(
            this.conversationRepo
        );
        this.accountService = new AccountService(
            this.accountRepo,
            this.auctionRepo2
        );
    }

    private setUpMiddleware() {
        logger.info("Setting up middleware...");

        morgan.token("userId", function (req: Request) {
            return req.user ? req.user.id : "-";
        });
        this.app.use(
            morgan("[:userId] :method :url :status - :response-time \bms", {
                skip: (req) => req.method === "OPTIONS",
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
        this.app.use(helmet());
    }

    private setUpRouters() {
        logger.info("Setting up routers...");

        const ALL_ROUTERS: BaseRouter[] = [
            new PingRouter(),
            new AuthRouter(this.accountRepo),
            new AuctionRouter(
                this.auctionService,
                this.auctionRepo,
                this.cloudinaryService
            ),
            new BidRouter(this.bidService, this.websocketManager.auctionWS()),
            new LocationRouter(this.locationRepo),
            new CommentRouter(
                this.commentRepo,
                this.websocketManager.auctionWS()
            ),
            new BrandRouter(this.brandRepo),
            new ConversationRouter(this.conversationService),
            new AccountRouter(this.accountService),
        ];

        for (const router of ALL_ROUTERS) {
            logger.info(
                `Registering router with endpoint '${router.getPath()}'`
            );
            this.app.use(router.getPath(), router.getRouter());
        }
        // TODO: Remove this, and use cloudinary for everything
        // TODO: Actually I changed my mind, use a env variable to control wether we want ALL uploads to go to cloudinary or to the server
        logger.warn("Exposing static files from ./public folder");
        this.app.use("/", express.static("./public"));
    }

    private setUpErrorHandling() {
        logger.info("Setting up error handling...");

        this.app.use(errorHandling());
    }

    private setUpCronJobs() {
        // @ts-expect-error: in development during hot-reloading, bun will rerun this piece of code every time,
        // causing many jobs to be registered at the same time.. So we have to do this magic for now, saving it
        // in a global variable which isn't reset on hot-reloads
        // In an ideal scenario, this should probably be it's own service, or this should be some sort of a scheduled
        // job or something with BullMQ, idk, but for now this will be OK
        if (!globalThis.processEndedAuctionsJob) {
            const processEndedAuctionsJob = async () => {
                const start = new Date();
                logger.info(
                    `processEndedAuctionsJob started at ${start.toISOString()}`
                );

                await this.auctionService.processEndedAuctions();

                const end = new Date();
                const durationMs = end.getTime() - start.getTime();
                logger.info(
                    `processEndedAuctionsJob executed in ${durationMs}ms`
                );

                setTimeout(processEndedAuctionsJob, 30000);
            };

            // @ts-expect-error: see above
            globalThis.processEndedAuctionsJob = processEndedAuctionsJob;
            setTimeout(processEndedAuctionsJob, 30000);
        }
    }

    private listen() {
        this.httpServer.listen(PORT);
        logger.info(`Server started, listening on port ${PORT}`);
    }

    public run() {
        logger.info(`Starting server with NODE_ENV: '${NODE_ENV}'`);

        this.setUpMiddleware();
        this.setUpRouters();
        this.setUpErrorHandling();
        this.setUpCronJobs();
        this.listen();
    }
}
