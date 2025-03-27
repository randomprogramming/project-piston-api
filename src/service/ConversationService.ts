import type ConversationRepository from "../repository/ConversationRepository";

export default class ConversationService {
    constructor(private conversationRepo: ConversationRepository) {}
}
