import type { Request, Response } from "express";
import { auth } from "../util/auth/middleware";
import BaseRouter, { API_VERSION } from "./BaseRouter";
import { parseId } from "../dto/common";
import type BidService from "../service/BidService";
import { parseBidDto } from "../dto/bid";
import ResponseErrorMessageBuilder from "./response/ResponseErrorMessageBuilder";
import HttpStatus from "../HttpStatus";

export default class BidRouter extends BaseRouter {
    constructor(private bidService: BidService) {
        super(API_VERSION.V1, "/bids");

        this.router.post("/auction/:id", auth(), this.placeBid);
        this.router.get("/auction/:id", this.getAuctionBids);
    }

    public placeBid = async (req: Request, res: Response) => {
        const auctionId = parseId(req.params);
        const bidDto = parseBidDto(req.body);

        const bidResult = await this.bidService.placeBid(
            req.user!.id,
            auctionId,
            bidDto
        );

        if (!bidResult.ok) {
            return ResponseErrorMessageBuilder.bid()
                .addDetail(bidResult.error)
                .log(
                    "placeBid",
                    `Bid by '${req.user!.id}' 
                    bidding  on auction '${auctionId}' failed!
                    Reason: '${bidResult.error}'`
                )
                .send(res);
        }

        // TODO: ping websocket with new bid here
        res.status(HttpStatus.Created).send();
    };

    public getAuctionBids = async (req: Request, res: Response) => {
        res.send();
    };
}
