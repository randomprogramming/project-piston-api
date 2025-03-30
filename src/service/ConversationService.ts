import type ConversationRepository from "../repository/ConversationRepository";
import type { ConversationDto, MessageDto } from "../dto/conversation";
import { DbError } from "../exception";
import logger from "../logger";

export default class ConversationService {
    constructor(private conversationRepo: ConversationRepository) {}

    public sendMessage = async (
        dto: MessageDto,
        conversationId: string,
        senderId: string
    ) => {
        const msg = await this.conversationRepo.createMessage(
            dto.content,
            conversationId,
            senderId
        );
        if (!msg) {
            throw new DbError(
                `Failed to create msg with dto: '${JSON.stringify(dto)}'`
            );
        }

        return msg;
    };

    public createConversation = async (
        creatorId: string,
        conversationDto: ConversationDto
    ) => {
        const { participantIds, auctionId, initialMessageContent } =
            conversationDto;
        if (!participantIds.includes(creatorId)) {
            participantIds.push(creatorId);
        }
        logger.info(
            `User '${creatorId}' creating conversation with ${participantIds.length} participants, for auction '${conversationDto?.auctionId}'`
        );

        let conversation = await this.conversationRepo.findUnique(
            participantIds,
            auctionId
        );
        if (!conversation) {
            conversation = await this.conversationRepo.createConversation(
                participantIds,
                auctionId
            );
        }
        if (!conversation) {
            throw new DbError(
                `Unable to create conversation for auction '${auctionId}' with participants [${participantIds.join(
                    ", "
                )}]. Creator: '${creatorId}'. Initial message content length: ${
                    initialMessageContent.length
                }`
            );
        }

        await this.conversationRepo.createMessage(
            conversation.id,
            creatorId,
            initialMessageContent
        );

        return conversation;
    };

    public getConversationPreviewsForUser = async (accountId: string) => {
        return this.conversationRepo.findPreviewsForAccount(accountId);
    };

    /**
     * Paginated function for fetching messages inside a conversation.
     * Requires @param requestorId so that we know that the user is actually allowed to query for that conversation.
     */
    public getMessagesForConversationPaginated = async (
        requestorId: string,
        conversationId: string,
        cursor?: string
    ) => {
        return this.conversationRepo.findConversationMessagesPaginated(
            requestorId,
            conversationId,
            cursor
        );
    };
}
