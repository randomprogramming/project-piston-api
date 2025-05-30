import type { Prisma, PrismaClient } from "@prisma/client";
import logger from "../logger";

export default class ConversationRepository {
    constructor(private prisma: PrismaClient) {}

    /**
     * Find a unique conversation. A conversation is conseder the same if the auctionId and the list of participants EXACTLY match
     */
    public findUnique = async (
        participantIds: string[],
        auctionId?: string | null
    ) => {
        const conversation = await this.prisma.conversation.findFirst({
            where: {
                auctionId,
                participants: {
                    // Contains every participant in the passed in list
                    every: { accountId: { in: participantIds } },
                    // Doesn't contain any participant which isn't in the passed in list
                    none: { accountId: { notIn: participantIds } },
                },
            },
            include: {
                _count: {
                    select: {
                        participants: true,
                    },
                },
            },
        });

        if (!conversation) {
            return null;
        }

        // Different number of participants means not the same conversation!
        if (participantIds.length !== conversation._count.participants) {
            return null;
        }

        // Remove the _count property from returned entity...
        const { _count, ...conversationDestruct } = conversation;
        return conversationDestruct;
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

    /**
     * Check if a Participant with the given conversationId and accountId exists, and if it exists, creates a new message
     */
    public createMessage = async (
        content: string,
        conversationId: string,
        senderId: string
    ) => {
        return this.prisma.$transaction(async (txn) => {
            const participant = await txn.participant.findFirst({
                where: {
                    accountId: senderId,
                    conversationId,
                },
            });
            if (!participant) {
                logger.error(
                    `User '${senderId}' trying to send message to conversation where doesn't exist or they are not a participant of: '${conversationId}'`
                );
                return;
            }

            return await txn.conversationMessage.create({
                data: {
                    conversationId,
                    senderId,
                    content,
                },
                include: {
                    sender: {
                        select: {
                            id: true,
                            username: true,
                        },
                    },
                },
            });
        });
    };

    // TODO: Needs Pagination...
    /**
     * Find previews of conversations where @param accountId is a participant.
     * Conversation may not be tied to an auction, but if it is, we will return some basic info about the auction.
     * Conversation are ordered by date of latest message descending (newest to oldest) [using raw SQL because prisma does not support this].
     * If conversation has no messages, it takes the createdAt of the conversation as the "latest message".
     */
    public findPreviewsForAccount = async (accountId: string) => {
        interface ConversationPreview {
            id: string;
            latestMessageDate: string;
            latestMessageContent: string | null;
            latestMessageSenderUsername: string | null;
            auctionCoverPhoto: string | null;
            carInformationUeCarBrand: string | null;
            carInformationUeCarModel: string | null;
            carInformationModelYear: string | null;
            carInformationTrim: string | null;
            carInformationCarModelName: string | null;
            carInformationCarBrandName: string | null;
        }

        // prettier-ignore
        const conversations = await this.prisma.$queryRaw<ConversationPreview[]>`
            WITH LatestMessages AS (
                SELECT
                    cm."conversationId",
                    MAX(cm."createdAt") as "latestMessageDate"
                FROM "ConversationMessage" cm
                GROUP BY cm."conversationId"
            )
            SELECT 
                c.id,
                ci."ueCarBrand" as "carInformationUeCarBrand",
                ci."ueCarModel" as "carInformationUeCarModel",
                ci."modelYear" as "carInformationModelYear",
                ci."trim" as "carInformationTrim",
                ci."carModelName" as "carInformationCarModelName",
                ci."carBrandName" as "carInformationCarBrandName",
                COALESCE(lm."latestMessageDate", c."createdAt") as "latestMessageDate",
                cm."content" as "latestMessageContent",
                sender."username" as "latestMessageSenderUsername",
                (SELECT
                    am."url"
                FROM "Media" am
                WHERE am."group" = 'EXTERIOR'
                ORDER BY am."order" ASC
                LIMIT 1) as "auctionCoverPhoto"
            FROM "Conversation" c
            JOIN "Participant" p ON c.id = p."conversationId"
            LEFT JOIN LatestMessages lm ON c.id = lm."conversationId"
            LEFT JOIN "ConversationMessage" cm 
                ON cm."conversationId" = c.id 
                AND cm."createdAt" = lm."latestMessageDate"
            LEFT JOIN "Account" sender
                ON sender."id" = cm."senderId"
            LEFT JOIN "Auction" a
                ON a.id = c."auctionId"
            LEFT JOIN "AuctionCarInformation" ci
                ON a."carInformationId" = ci.id
            WHERE p."accountId" = ${accountId}
            ORDER BY "latestMessageDate" DESC
        `;

        return conversations;
    };

    public findConversationMessagesPaginated = async (
        requestorId: string,
        conversationId: string,
        cursor?: string,
        pageSize: number = 20
    ) => {
        const where: Prisma.ConversationMessageWhereInput = {
            conversationId,
            conversation: {
                participants: {
                    some: {
                        accountId: requestorId,
                    },
                },
            },
        };

        const messages = await this.prisma.conversationMessage.findMany({
            select: {
                id: true,
                content: true,
                createdAt: true,
                sender: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
            },
            where,
            orderBy: { createdAt: "desc" },
            take: pageSize + 1, // Fetch one extra to check for next cursor
            skip: cursor ? 1 : 0, // Skip the cursor item itself
            cursor: cursor ? { id: cursor } : undefined,
        });

        const hasNextPage = messages.length > pageSize;
        const next = hasNextPage ? messages[pageSize].id : null;

        return {
            messages: hasNextPage ? messages.slice(0, pageSize) : messages,
            next,
        };
    };
}
