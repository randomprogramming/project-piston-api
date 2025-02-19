import type { Request, Response } from "express";
import type AuctionRepository from "../repository/AuctionRepository";
import type MediaRepository from "../repository/MediaRepository";
import type { ImageStorage } from "../imagestorage/ImageStorage";
import type CloudinaryService from "../service/CloudinaryService";
import type AuctionService from "../service/AuctionService";
import BaseRouter, { API_VERSION } from "./BaseRouter";
import { auth, hasAdminRole } from "../util/auth/middleware";
import { parseAuctionDto } from "../dto/auction";
import HttpStatus from "../HttpStatus";
import { imageUpload } from "../middleware/file";
import { AUCTION_IMAGE_HOST } from "../env";
import ResponseErrorMessageBuilder from "./response/ResponseErrorMessageBuilder";
import path from "path";
import { parseId, parsePrettyId } from "../dto/common";
import { AuctionState, ImageGroup, Role } from "@prisma/client";
import { parseMediaUploadDto } from "../dto/media";
import { mapAuction } from "./response/auctionMapping";

export default class AuctionRouter extends BaseRouter {
    constructor(
        private auctionService: AuctionService,
        // TODO: should not be using the repo directly...
        private auctionRepo: AuctionRepository,
        private mediaRepo: MediaRepository,
        private imageStorage: ImageStorage,
        private cloudinaryService: CloudinaryService
    ) {
        super(API_VERSION.V1, "/auctions");

        this.router.post(
            "/",
            auth(),
            imageUpload.single("image"),
            this.submitAuction
        );
        this.router.get("/", this.getAuctionsPaginated);
        this.router.post(
            "/media/authenticate",
            auth(),
            this.authenticateCloudinary
        );
        this.router.get("/seller/id/:id", auth(), this.getAuctionsBySellerId);
        this.router.post("/id/:id/media", auth(), this.addAuctionMedia);
        this.router.get("/id/:id/preview", auth(), this.getPreview);
        this.router.get("/pretty-id/:pretty_id", this.getAuction);
        this.router.patch(
            "/id/:id/request-review",
            auth(),
            this.submitAuctionForReview
        );
        this.router.get(
            "/admin/pending",
            ...hasAdminRole(),
            this.getPendingAuctions
        );
        this.router.patch(
            "/admin/id/:id/accept",
            ...hasAdminRole(),
            this.acceptSubbmittedAuction
        );
        this.router.patch(
            "/admin/id/:id/go-live",
            ...hasAdminRole(),
            this.auctionGoLive
        );
    }

    public getAuctionsPaginated = async (req: Request, res: Response) => {
        const paginatedResponse =
            await this.auctionService.getAuctionsPaginated();

        res.json({
            data: paginatedResponse.auctions.map((a) => {
                return {
                    id: a.id,
                    prettyId: a.prettyId,
                    state: a.state,
                    startDate: a.startDate,
                    endDate: a.endDate,
                    carInformation: {
                        ueCarBrand: a.carInformation.ueCarBrand,
                        ueCarModel: a.carInformation.ueCarModel,
                        modelYear: a.carInformation.modelYear,
                        trim: a.carInformation.trim,
                        carModelName: a.carInformation.carModelName,
                        carBrandName: a.carInformation.carBrandName,
                    },
                    currentBid:
                        a.bids.length > 0
                            ? { amount: a.bids[0].amount }
                            : undefined,
                    coverPhoto: a.media.length > 0 ? a.media[0].url : undefined,
                };
            }),
            count: paginatedResponse.totalCount,
        });
    };

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
        // TODO: read the ID from the url.. make sure to do that change on the frontend also
        // Also, this will be "public" data which can be seen by anyone, so use a mapper to return onmly
        // some data
        // if req.query.sellerId === req.user.id, we can return some extra data.
        const auctions = await this.auctionService.getAuctionsOfSeller(
            req.user!.id
        );

        res.json(auctions);
    };

    public getPreview = async (req: Request, res: Response) => {
        const id = parseId(req.params);
        const auction = await this.auctionService.getAuctionById(id);

        // The owner of the auction and any admin may see the preview
        const maySeePreview =
            auction?.sellerId !== req.user!.id || req.user!.role === Role.ADMIN;
        if (!auction || !maySeePreview) {
            return ResponseErrorMessageBuilder.auction()
                .addDetail(id, "not_found")
                .log(
                    "getPreview",
                    `Auction defined: '${!!auction}', maySeePreview: '${maySeePreview}'`
                )
                .send(res, HttpStatus.NotFound);
        }

        res.json(auction);
    };

    public getAuction = async (req: Request, res: Response) => {
        const prettyId = parsePrettyId(req.params);
        const auction = await this.auctionService.getAuction(prettyId);

        if (!auction) {
            return ResponseErrorMessageBuilder.auction()
                .addDetail("not_found")
                .log("getAuction", `Auction '${prettyId}' not found`)
                .send(res, HttpStatus.NotFound);
        }

        res.json(mapAuction(auction));
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
        const result = await this.auctionService.acceptSubbmittedAuction(id);

        if (!result.ok) {
            return ResponseErrorMessageBuilder.auction()
                .addDetail(result.error)
                .log(
                    "acceptSubbmittedAuction",
                    `Failed to accept submitted auction because '${result.error}' for auction id: '${id}'`
                )
                .send(res);
        }

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
        const result = await this.auctionService.auctionGoLive(id);

        if (!result.ok) {
            res.status(HttpStatus.BadRequest).send(result.error);
            return;
        }

        res.send();
    };
}
