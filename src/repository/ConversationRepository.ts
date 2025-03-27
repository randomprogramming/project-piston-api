import type { PrismaClient } from "@prisma/client";

export default class ConversationRepository {
    constructor(private prisma: PrismaClient) {}
}
