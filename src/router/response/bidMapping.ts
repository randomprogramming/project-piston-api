import type { Bid } from "@prisma/client";

export function mapBidAndBidder(
    bid: Bid & { bidder: { username: string | null } }
) {
    return mapBid(bid, bid.bidder.username);
}

export function mapBid(bid: Bid, bidderUsername: string | null) {
    return {
        id: bid.id,
        amount: bid.amount,
        bidder: {
            username: bidderUsername,
        },
        createdAt: bid.createdAt,
    };
}

export type MappedBid = ReturnType<typeof mapBid>;
