import type { Request, Response } from "express";
import type AuctionRepository from "../repository/AuctionRepository";
import type MediaRepository from "../repository/MediaRepository";
import type { ImageStorage } from "../imagestorage/ImageStorage";
import BaseRouter, { API_VERSION } from "./BaseRouter";
import { auth, hasAdminRole } from "../util/auth/middleware";
import { parseAuctionDto } from "../dto/auction";
import HttpStatus from "../HttpStatus";
import { imageUpload } from "../middleware/file";
import { AUCTION_IMAGE_HOST } from "../env";
import ResponseErrorMessageBuilder from "./response/ResponseErrorMessageBuilder";
import path from "path";

export default class AuctionRouter extends BaseRouter {
    constructor(
        private auctionRepo: AuctionRepository,
        private mediaRepo: MediaRepository,
        private imageStorage: ImageStorage
    ) {
        super(API_VERSION.V1, "/auction");

        this.router.post(
            "/submit",
            auth(),
            imageUpload.single("image"),
            this.submitAuction
        );
        this.router.get(
            "/admin/pending",
            auth(),
            hasAdminRole(),
            this.getPendingAuctions
        );
    }

    public submitAuction = async (req: Request, res: Response) => {
        // When using file upload middleware, the body JSON arrives serialized
        const auctionDto = parseAuctionDto(JSON.parse(req.body.auction));
        if (!req.file) {
            return ResponseErrorMessageBuilder.auction()
                .addDetail("file", "missing")
                .send(res);
        }

        const { id } = await this.auctionRepo.createWithStateSubmitted(
            req.user!.id,
            auctionDto.carInformation,
            auctionDto.contactDetails
        );
        const imagePath = await this.imageStorage.saveImage(
            id,
            "cover" + path.extname(req.file.originalname),
            req.file.buffer
        );
        // Remove the trailing slash from host and leading slash from path, and ensure exactly one slash
        const imageUrl =
            AUCTION_IMAGE_HOST.href.replace(/\/$/, "") +
            "/" +
            imagePath.replace(/^\//, "");
        await this.mediaRepo.createForAuction(id, imagePath, imageUrl);

        res.status(HttpStatus.Created).send(id);
    };

    /**
     * Pending auctions are auctions with state "SUBMITTED" or "UNDER_REVIEW", both of which can be
     * accepted and rejected by an admin.
     */
    public getPendingAuctions = async (_req: Request, res: Response) => {
        const auctions =
            await this.auctionRepo.findAllWhereStateIsSubmittedOrUnder_ReviewLimit10OrderByUpdatedAtIncludeAll();

        res.json(auctions);
    };
}
