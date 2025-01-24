import type { Request, Response } from "express";
import type AuctionRepository from "../repository/AuctionRepository";
import BaseRouter, { API_VERSION } from "./BaseRouter";
import { auth } from "../util/auth/middleware";
import { parseAuctionDto } from "../dto/auction";
import HttpStatus from "../HttpStatus";

export default class AuctionRouter extends BaseRouter {
    constructor(private auctionRepo: AuctionRepository) {
        super(API_VERSION.V1, "/auction");

        this.router.post("/submit", auth(), this.submitAuction);
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
}
