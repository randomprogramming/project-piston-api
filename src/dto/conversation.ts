import { z } from "zod";

const message = () => z.string().min(1).max(720);

const ConversationDto = z.object({
    participantIds: z.array(z.string()).min(1).max(10),
    initialMessageContent: message(),
    auctionId: z.string().optional(),
});
export function parseConversationDto(obj: any) {
    return ConversationDto.parse(obj);
}
export type ConversationDto = z.infer<typeof ConversationDto>;
