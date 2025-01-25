import type { Request, Response } from "express";
import type AuctionRepository from "../repository/AuctionRepository";
import BaseRouter, { API_VERSION } from "./BaseRouter";
import { auth, hasAdminRole } from "../util/auth/middleware";
import { parseAuctionDto } from "../dto/auction";
import HttpStatus from "../HttpStatus";

export default class AuctionRouter extends BaseRouter {
    constructor(private auctionRepo: AuctionRepository) {
        super(API_VERSION.V1, "/auction");

        this.router.post("/submit", auth(), this.submitAuction);
        this.router.get(
            "/admin/submitted",
            auth(),
            hasAdminRole(),
            this.getSubmittedAuctions
        );
    }

    public submitAuction = async (req: Request, res: Response) => {
        const auctionDto = parseAuctionDto(req.body);

        const { id } = await this.auctionRepo.create(
            req.user!.id,
            auctionDto.carInformation,
            auctionDto.contactDetails
        );

        res.status(HttpStatus.Created).send(id);
    };

    public getSubmittedAuctions = async (req: Request, res: Response) => {
        const auctions =
            await this.auctionRepo.findAllWhereStateIsSubmittedLimit10OrderByNewest();

        res.json(auctions);
    };
}
