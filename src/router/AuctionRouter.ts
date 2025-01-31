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
import { parseId } from "../dto/common";
import { AuctionState, ImageGroup, Role } from "@prisma/client";
import { parseMediaUploadDto } from "../dto/media";

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
        this.router.post("/id/:id/media", auth(), this.addAuctionMedia);
        this.router.get("/seller/me", auth(), this.getMyAuctions);
        this.router.get("/id/:id/preview", auth(), this.getPreview);
        this.router.get(
            "/admin/pending",
            auth(),
            hasAdminRole(),
            this.getPendingAuctions
        );
        this.router.patch(
            "/admin/accept/:id",
            auth(),
            hasAdminRole(),
            this.acceptSubbmittedAuction
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

    public getMyAuctions = async (req: Request, res: Response) => {
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
     * Patching auction data endpoint for the user which created the auction
     */
    // public patchAuction = async (req: Request, res: Response) => {
    //     const id = parseId(req.params);
    //     // TODO: Don't use full patch data, instead just "cast" the specific data which user is allowed to edit
    //     // And then pass that into auctionRepo.updateById
    //     const patchData = parseAuctionPatchData(req.body);

    //     const auction = await this.auctionRepo.findById(id);

    //     if (!auction || req.user!.id !== auction.sellerId) {
    //         return ResponseErrorMessageBuilder.auction()
    //             .addDetail("not_found")
    //             .send(res, HttpStatus.NotFound);
    //     }

    //     // User is allowed to update auction only in specific auction states
    //     if (
    //         auction.state !== AuctionState.PENDING_CHANGES &&
    //         auction.state !== AuctionState.SUBMITTED
    //     ) {
    //         return ResponseErrorMessageBuilder.auction()
    //             .addDetail("not_patchable")
    //             .send(res);
    //     }
    //     // TODO: Finishme based on comment above
    //     // await this.auctionRepo.updateById(id, patchData);
    //     res.send();
    // };

    /**
     * Pending auctions are auctions with state "SUBMITTED" or "UNDER_REVIEW", both of which can be
     * accepted and rejected by an admin.
     */
    public getPendingAuctions = async (_req: Request, res: Response) => {
        const auctions =
            await this.auctionRepo.findAllWhereStateIsSubmittedOrUnder_ReviewLimit10OrderByUpdatedAtIncludeAll();

        res.json(auctions);
    };

    /**
     * Patching auction data endpoint specific for admins only
     */
    // public adminPatchAuction = async (req: Request, res: Response) => {
    //     const id = parseId(req.params);
    //     const patchData = parseAuctionPatchData(req.body);

    //     const auction = await this.auctionRepo.findById(id);

    //     if (!auction) {
    //         return ResponseErrorMessageBuilder.auction()
    //             .addDetail("not_found")
    //             .send(res, HttpStatus.NotFound);
    //     }

    //     logger.info(
    //         `Patching auction '${id}' with data '${JSON.stringify(patchData)}'`
    //     );
    //     await this.auctionRepo.updateById(id, patchData);
    //     res.send();
    // };

    public acceptSubbmittedAuction = async (req: Request, res: Response) => {
        const id = parseId(req.params);

        const auction = await this.auctionRepo.findById(id);

        if (!auction) {
            return ResponseErrorMessageBuilder.auction()
                .addDetail("not_found")
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
}
