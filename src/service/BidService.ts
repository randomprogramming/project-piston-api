import type { BidDto } from "../dto/bid";
import type BidRepository from "../repository/BidRepository";
import type AuctionService from "./AuctionService";
import { Err, Ok, type Result } from "../result";
import { AuctionState, type Bid } from "@prisma/client";
import logger from "../logger";

export default class BidService {
    constructor(
        private bidRepo: BidRepository,
        private auctionService: AuctionService
    ) {}

    public setAuctionService = (auctionService: AuctionService) => {
        this.auctionService = auctionService;
    };

    public placeBid = async (
        bidderId: string,
        auctionId: string,
        bidDto: BidDto
    ): Promise<Result<Bid, string>> => {
        logger.info(
            `User '${bidderId}' bidding '${bidDto.amount}' cents on auction '${auctionId}'`
        );

        const bidResult = await this.bidRepo.asTxn<Result<Bid, string>>(
            async (tx) => {
                const auction = await this.auctionService.findByIdLockRowTxn(
                    tx,
                    auctionId
                );
                if (!auction) {
                    return Err("auction_not_found");
                }

                const now = new Date();
                if (auction.state !== AuctionState.LIVE) {
                    return Err("auction_not_live");
                }
                if (!auction.startDate || now < auction.startDate) {
                    return Err("auction_not_started");
                }
                if (!auction.endDate || now > auction.endDate) {
                    return Err("auction_ended");
                }

                await this.auctionService.extendAuctionEndTime(
                    tx,
                    auction,
                    now
                );

                const currentBid =
                    await this.bidRepo.findCurrentBidForAuctionTxn(
                        tx,
                        auctionId
                    );
                if (bidDto.amount <= 0) {
                    return Err("amount_too_small");
                }
                if (currentBid && bidDto.amount <= currentBid.amount) {
                    return Err("amount_too_small");
                }

                const newBid = await this.bidRepo.createForAuctionTxn(
                    tx,
                    auctionId,
                    bidderId,
                    bidDto
                );
                if (!newBid) {
                    return Err("failed_to_create_bid");
                }

                return Ok(newBid);
            }
        );

        return bidResult;
    };

    public getCurrentBidAndBidderForAuction = async (auctionId: string) => {
        return this.bidRepo.findCurrentBidForAuctionIncludeBidder(auctionId);
    };

    public paginatedCommentsForAuction = async (auctionId: string) => {
        const bids =
            await this.bidRepo.findManyForAuctionIdIncludeBidderOrderByCreatedAtDesc(
                auctionId
            );

        return {
            data: bids,
            page: 1,
            totalPages: 1,
            pageSize: 0,
            count: 0,
        };
    };

    /**
     * Find and flag the winning bid for the passed in auctionId
     */
    public markWinningBid = async (auctionId: string) => {
        const bid = await this.getCurrentBidAndBidderForAuction(auctionId);

        if (!bid) {
            logger.info(`There was no winning bid for auction '${auctionId}'.`);
            return;
        }

        // TODO: Check if Reserve price is met here...
        logger.info(`Marking bid '${bid.id}' as the winning bid`);
        return this.bidRepo.markAsWinningBid(bid.id);
    };
}
