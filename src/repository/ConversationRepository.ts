import type { PrismaClient } from "@prisma/client";

export default class ConversationRepository {
    constructor(private prisma: PrismaClient) {}

    /**
     * Find a unique conversation. A conversation is conseder the same if the auctionId and the list of participants EXACTLY match
     */
    public findUnique = async (
        participantIds: string[],
        auctionId?: string | null
    ) => {
        return this.prisma.conversation.findFirst({
            where: {
                auctionId,
                participants: {
                    // Contains every participant in the passed in list
                    every: { accountId: { in: participantIds } },
                    // Doesn't contain any participant which isn't in the passed in list
                    none: { accountId: { notIn: participantIds } },
                },
            },
        });
    };

    /**
     * // TODO: This is not atomic, i.e. if we have multiple nodes executing this code, we will get
     * // multiple inserts which should be "unique", fix that
     * // Conversation is unique by it's participants and auctionId, see @function findUnique
     * Create a conversation with the passed in participants
     * @param participantIds list of account ids which will participate in this conversation
     * @param auctionId auction id which is tied to this conversation, it is optional, conversation doesn't have to be tied to an auction
     */
    public createConversation = async (
        participantIds: string[],
        auctionId?: string
    ) => {
        return this.prisma.conversation.create({
            data: {
                auctionId,
                participants: {
                    createMany: {
                        data: participantIds.map((pid) => ({
                            accountId: pid,
                        })),
                        skipDuplicates: true,
                    },
                },
            },
        });
    };

    public createMessage = async (
        conversationId: string,
        senderId: string,
        content: string
    ) => {
        return this.prisma.conversationMessage.create({
            data: {
                conversationId,
                senderId,
                content,
            },
        });
    };
}
