import type { BidDto } from "../dto/bid";
import type BidRepository from "../repository/BidRepository";
import { Err, Ok, type Result } from "../result";
import { AuctionState, type Bid } from "@prisma/client";
import logger from "../logger";
import type AuctionRepository2 from "../repository/AuctionRepository2";

export default class BidService {
    constructor(
        private bidRepo: BidRepository,
        private auctionRepo: AuctionRepository2
    ) {}

    public placeBid = async (
        bidderId: string,
        auctionId: string,
        bidDto: BidDto
    ): Promise<Result<Bid, string>> => {
        logger.info(
            `User '${bidderId}' bidding '${bidDto.amount}' cents on auction '${auctionId}'`
        );

        const bidResult = await this.bidRepo.asTransaction<Result<Bid, string>>(
            async (tx) => {
                const auction = await this.auctionRepo.findByIdLockRow(
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
                // TODO: If time until end is less than ~5 mins? or something, we need to extend the auction to prevent sniping

                const currentBid = await this.getCurrentBidForAuction(
                    auctionId
                );
                if (currentBid && bidDto.amount <= currentBid.amount) {
                    return Err("amount_too_small");
                }
                const newBid = await this.bidRepo.createForAuction(
                    auctionId,
                    bidderId,
                    bidDto,
                    tx
                );
                if (!newBid) {
                    return Err("bid_failed");
                }

                return Ok(newBid);
            }
        );

        return bidResult;
    };

    /**
     * Current Bid is the bid with the highest amount on an auction
     */
    public getCurrentBidForAuction = async (auctionId: string) => {
        return this.bidRepo.findCurrentBidForAuction(auctionId);
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
}
