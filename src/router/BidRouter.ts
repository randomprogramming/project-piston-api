import type { Request, Response } from "express";
import type AuctionWebSocketService from "../service/ws/AuctionWebSocketService";
import type BidService from "../service/BidService";
import { auth } from "../util/auth/middleware";
import BaseRouter, { API_VERSION } from "./BaseRouter";
import { parseId } from "../dto/common";
import { parseBidDto } from "../dto/bid";
import ResponseErrorMessageBuilder from "./response/ResponseErrorMessageBuilder";
import HttpStatus from "../HttpStatus";
import { mapBid } from "./response/bidMapping";
import logger from "../logger";

export default class BidRouter extends BaseRouter {
    constructor(
        private bidService: BidService,
        private auctionWSService: AuctionWebSocketService
    ) {
        super(API_VERSION.V1, "/bids");

        this.router.post("/auction/:id", auth(), this.placeBid);
        this.router.get("/auction/:id", this.getAuctionBids);
        this.router.get("/auction/:id/current", this.getCurrentBid);
    }

    public placeBid = async (req: Request, res: Response) => {
        const auctionId = parseId(req.params);
        const bidDto = parseBidDto(req.body);

        if (!req.user!.username) {
            // TODO: Use a middleware instead of this. And there is another method somewher which also has a TODO
            // for this withUsername middleware. (CommentRouter file)
            return ResponseErrorMessageBuilder.bid()
                .addDetail("missing_username")
                .log(
                    `User '${
                        req.user!.id
                    }' is trying to place a bid without a username!`
                )
                .send(res, HttpStatus.Unauthorized);
        }

        const bidResult = await this.bidService.placeBid(
            req.user!.id,
            auctionId,
            bidDto
        );

        if (!bidResult.ok) {
            return ResponseErrorMessageBuilder.bid()
                .addDetail(bidResult.error)
                .log(
                    `Bid by '${req.user!.id}' 
                    bidding  on auction '${auctionId}' failed!
                    Reason: '${bidResult.error}'`,
                    "placeBid"
                )
                .send(res);
        }

        this.auctionWSService.emitNewCommentOrBid(
            auctionId,
            mapBid({ ...bidResult.value, username: req.user!.username })
        );
        res.status(HttpStatus.Created).send();
    };

    public getAuctionBids = async (req: Request, res: Response) => {
        const auctionId = parseId(req.params);

        const paginatedBids = await this.bidService.paginatedCommentsForAuction(
            auctionId
        );

        res.json(paginatedBids);
    };

    public getCurrentBid = async (req: Request, res: Response) => {
        const auctionId = parseId(req.params);
        const currentBid =
            await this.bidService.getCurrentBidAndBidderForAuction(auctionId);

        // Returning NULL with Status OK is fine here, as this will happen very often
        // And it is technically correct, there just isn't a currentBid for that auction yet
        if (!currentBid) {
            res.send(null);
            return;
        }

        if (!currentBid.bidder.username) {
            logger.error(`Bidder for bid '${currentBid.id}' has no username`);
        }
        res.json(
            mapBid({
                ...currentBid,
                username: currentBid.bidder.username || "-",
            })
        );
    };
}
