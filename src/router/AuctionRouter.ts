import type { Request, Response } from "express";
import type AuctionRepository from "../repository/AuctionRepository";
import type MediaRepository from "../repository/MediaRepository";
import type { ImageStorage } from "../imagestorage/ImageStorage";
import type CloudinaryService from "../service/CloudinaryService";
import BaseRouter, { API_VERSION } from "./BaseRouter";
import { auth, hasAdminRole } from "../util/auth/middleware";
import { parseAuctionDto } from "../dto/auction";
import HttpStatus from "../HttpStatus";
import { imageUpload } from "../middleware/file";
import { AUCTION_IMAGE_HOST } from "../env";
import ResponseErrorMessageBuilder from "./response/ResponseErrorMessageBuilder";
import path from "path";
import { parseId } from "../dto/common";
import { AuctionState, ImageGroup, Role } from "@prisma/client";
import { parseMediaUploadDto } from "../dto/media";

export default class AuctionRouter extends BaseRouter {
    constructor(
        private auctionRepo: AuctionRepository,
        private mediaRepo: MediaRepository,
        private imageStorage: ImageStorage,
        private cloudinaryService: CloudinaryService
    ) {
        super(API_VERSION.V1, "/auction");

        this.router.post(
            "/",
            auth(),
            imageUpload.single("image"),
            this.submitAuction
        );
        this.router.post(
            "/media/authenticate",
            auth(),
            this.authenticateCloudinary
        );
        this.router.get("/seller/id/:id", auth(), this.getAuctionsBySellerId);
        this.router.post("/id/:id/media", auth(), this.addAuctionMedia);
        this.router.get("/id/:id/preview", auth(), this.getPreview);
        this.router.patch(
            "/id/:id/request-review",
            auth(),
            this.submitAuctionForReview
        );
        this.router.get(
            "/admin/pending",
            auth(),
            hasAdminRole(),
            this.getPendingAuctions
        );
        this.router.patch(
            "/admin/id/:id/accept",
            auth(),
            hasAdminRole(),
            this.acceptSubbmittedAuction
        );
        this.router.patch(
            "/admin/id/:id/go-live",
            auth(),
            hasAdminRole(),
            this.auctionGoLive
        );
    }

    public submitAuction = async (req: Request, res: Response) => {
        // When using file upload middleware, the body JSON arrives serialized
        const auctionDto = parseAuctionDto(JSON.parse(req.body.auction));
        if (!req.file) {
            return ResponseErrorMessageBuilder.auction()
                .addDetail("image", "missing")
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
        await this.mediaRepo.createForAuction(id, ImageGroup.EXTERIOR, {
            url: imageUrl,
            order: 0,
        });

        res.status(HttpStatus.Created).send(id);
    };

    public getAuctionsBySellerId = async (req: Request, res: Response) => {
        const auctions = await this.auctionRepo.findBySellerIdIncludeAll(
            req.user!.id
        );

        res.json(auctions);
    };

    public getPreview = async (req: Request, res: Response) => {
        const id = parseId(req.params);
        const auction = await this.auctionRepo.findByIdIncludeAll(id);

        // The owner of the auction and any admin may see the preview
        const maySeePreview =
            auction?.sellerId !== req.user!.id || req.user!.role === Role.ADMIN;
        if (!auction || !maySeePreview) {
            return ResponseErrorMessageBuilder.auction()
                .addDetail(id, "not_found")
                .send(res, HttpStatus.NotFound);
        }

        res.json(auction);
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

    public submitAuctionForReview = async (req: Request, res: Response) => {
        const id = parseId(req.params);

        const auction = await this.auctionRepo.findByIdAndSellerIdAndState(
            id,
            req.user!.id,
            AuctionState.PENDING_CHANGES
        );
        if (!auction) {
            return ResponseErrorMessageBuilder.auction()
                .addDetail("not_found")
                .send(res, HttpStatus.NotFound);
        }

        await this.auctionRepo.updateStateById(id, AuctionState.UNDER_REVIEW);
        res.send();
    };

    public acceptSubbmittedAuction = async (req: Request, res: Response) => {
        const id = parseId(req.params);

        const auction = await this.auctionRepo.findById(id);

        if (!auction) {
            return ResponseErrorMessageBuilder.auction()
                .addDetail("not_found")
                .log("acceptSubbmittedAuction", "Requested auction not found")
                .send(res, HttpStatus.NotFound);
        }

        if (auction.state !== AuctionState.SUBMITTED) {
            return ResponseErrorMessageBuilder.auction()
                .addDetail("not_acceptable")
                .log(
                    "acceptSubbmittedAuction",
                    `Unable to accept auction '${auction.id}' as it is not in the '${AuctionState.SUBMITTED}' state`
                )
                .send(res);
        }

        await this.auctionRepo.updateStateById(
            id,
            AuctionState.PENDING_CHANGES
        );
        res.send();
    };

    public addAuctionMedia = async (req: Request, res: Response) => {
        const id = parseId(req.params);
        const data = parseMediaUploadDto(req.body);

        // May upload photos only when auction is in PENDING_CHANGES state
        const auction = await this.auctionRepo.findByIdAndSellerIdAndState(
            id,
            req.user!.id,
            AuctionState.PENDING_CHANGES
        );
        if (!auction) {
            return ResponseErrorMessageBuilder.auction()
                .addDetail("not_found")
                .send(res, HttpStatus.NotFound);
        }
        // TODO: We need to do validation to make sure that the order is correct
        // Newly added pictures may only be added to the end, and then the user may re-order them
        await this.mediaRepo.createManyForAuction(id, data.group, data.media);
        res.send();
    };

    public authenticateCloudinary = async (_req: Request, res: Response) => {
        // TODO: Check auction is in state PENDING_CHANGES and has less than 200 images
        const resp = this.cloudinaryService.authenticateCloudinary();

        res.json(resp);
    };

    public auctionGoLive = async (req: Request, res: Response) => {
        const id = parseId(req.params);
        const auction = await this.auctionRepo.findById(id);

        if (!auction) {
            return ResponseErrorMessageBuilder.auction()
                .addDetail("not_found")
                .send(res, HttpStatus.NotFound);
        }

        if (auction.state !== AuctionState.UNDER_REVIEW) {
            return ResponseErrorMessageBuilder.auction()
                .addDetail("invalid_state")
                .log(
                    "auctionGoLive",
                    `Expected state UNDER_REVIEW, found '${auction.state}'`
                )
                .send(res);
        }

        await this.auctionRepo.updateStateById(id, AuctionState.LIVE);
        res.send();
    };
}
