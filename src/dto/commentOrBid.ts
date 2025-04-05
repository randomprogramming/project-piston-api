import { z } from "zod";

export const CommentDto = z.object({
    content: z.string().min(1).max(420),
});
export type CommentDto = z.infer<typeof CommentDto>;

export function parseCommentDto(obj: any) {
    return CommentDto.parse(obj);
}

/**
 * This interface is for the type in the auction view where we show comments and bids in the same list
 * So each item will be either a Comment or a Bid. For Comments, the content field is the content of the comment,
 * and for Bids, the content field is the bid amount in cents as a string
 */
export interface CommentOrBid {
    id: string;
    auctionId: string;
    content: string;
    username: string;
    createdAt: string | Date;
    type: "comment" | "bid";
}
