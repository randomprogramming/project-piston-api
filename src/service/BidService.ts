import type { BidDto } from "../dto/bid";
import type BidRepository from "../repository/BidRepository";
import type AuctionRepository from "../repository/AuctionRepository";
import { Err, Ok, type Result } from "../result";
import { AuctionState, type Bid } from "@prisma/client";
import logger from "../logger";

export default class BidService {
    constructor(
        private bidRepo: BidRepository,
        private auctionRepo: AuctionRepository
    ) {}

    public placeBid = async (
        bidderId: string,
        auctionId: string,
        bidDto: BidDto
    ): Promise<Result<Bid, string>> => {
        logger.info(
            `User '${bidderId}' bidding '${bidDto.amount}' cents on auction '${auctionId}'`
        );

        // TODO: What if auction row is locked, but another endpoint, like actually fetching the auction for a preview,
        // tries to access it. Is it also locked? Shouldnt be, right? since it's like only inside this transaction? idk check it out
        // either way.
        const bidResult = await this.bidRepo.asTransaction<Result<Bid, string>>(
            async (tx) => {
                // While the auction row is locked, no other bids can be inserted for that auction
                const auction = await this.auctionRepo.findByIdLockRow(
                    tx,
                    auctionId
                );
                if (!auction) {
                    return Err("auction_not_found");
                }
                // TODO: Check: AuctionState === LIVE && now() => auction.startDate && now() < auction.endDate
                if (auction.state !== AuctionState.LIVE) {
                    return Err("auction_not_live");
                }
                const currentBid = await this.bidRepo.findCurrentBidForAuction(
                    auctionId
                );
                if (currentBid && bidDto.amount <= currentBid.amount) {
                    return Err("amount_too_small");
                }
                const newBid = await this.bidRepo.createForAuction(
                    auctionId,
                    bidderId,
                    bidDto
                );
                if (!newBid) {
                    return Err("bid_failed");
                }

                return Ok(newBid);
            }
        );

        return bidResult;
    };
}
