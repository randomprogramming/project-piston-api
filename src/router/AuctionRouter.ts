import type { Request, Response } from "express";
import type AuctionRepository from "../repository/AuctionRepository";
import type CloudinaryService from "../service/CloudinaryService";
import type AuctionService from "../service/AuctionService";
import BaseRouter, { API_VERSION } from "./BaseRouter";
import { auth, hasAdminRole } from "../util/auth/middleware";
import { parseAuctionDto, parsePaginatedAuctionQuery } from "../dto/auction";
import HttpStatus from "../HttpStatus";
import ResponseErrorMessageBuilder from "./response/ResponseErrorMessageBuilder";
import { parseId, parsePrettyId } from "../dto/common";
import { AuctionState, Role } from "@prisma/client";
import { parseMediaUploadDto } from "../dto/media";
import { mapAuction, mapBasicAuctions } from "./response/auctionMapping";

export default class AuctionRouter extends BaseRouter {
    constructor(
        private auctionService: AuctionService,
        // TODO: should not be using the repo directly...
        private auctionRepo: AuctionRepository,
        private cloudinaryService: CloudinaryService
    ) {
        super(API_VERSION.V1, "/auctions");

        this.router.post("/", auth(), this.submitAuction);
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
        const query = parsePaginatedAuctionQuery(req.query);
        const paginatedResponse =
            await this.auctionService.getAuctionsPaginated(query);

        res.json({
            data: mapBasicAuctions(paginatedResponse.auctions),
            count: paginatedResponse.totalCount,
        });
    };

    public submitAuction = async (req: Request, res: Response) => {
        const auctionDto = parseAuctionDto(req.body);

        const { id } = await this.auctionRepo.createWithStateSubmitted(
            req.user!.id,
            auctionDto.carInformation,
            auctionDto.contactDetails
        );

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

        const response = await this.auctionService.addMedia(
            id,
            req.user!.id,
            data
        );
        if (!response.ok) {
            return ResponseErrorMessageBuilder.auction()
                .addDetail(response.error)
                .log(
                    "addAuctionMedia",
                    `Error when uploading auction media: '${response.error}'. Auction ID: '${id}'`
                )
                .send(res);
        }

        res.send();
    };

    public authenticateCloudinary = async (_req: Request, res: Response) => {
        // TODO: Check auction is in state PENDING_CHANGES and has less than 200 images, there is aa method in auctionservice for chjecking this.
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
