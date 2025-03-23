import type { Bid } from "@prisma/client";
import type { CommentOrBid } from "../../dto/commentOrBid";

export function mapBid(bid: Bid & { username: string }): CommentOrBid {
    return {
        id: bid.id,
        content: bid.amount.toString(),
        username: bid.username,
        createdAt: bid.createdAt,
        type: "bid",
    };
}
