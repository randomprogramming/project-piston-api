import type { Request, Response } from "express";
import type ConversationService from "../service/ConversationService";
import BaseRouter, { API_VERSION } from "./BaseRouter";
import { auth } from "../util/auth/middleware";
import { parseConversationDto, parseMessageDto } from "../dto/conversation";
import HttpStatus from "../HttpStatus";
import { parseCursor, parseId } from "../dto/common";

export default class ConversationRouter extends BaseRouter {
    constructor(private conversationService: ConversationService) {
        super(API_VERSION.V1, "/conversations");

        // TODO: this endpoints needs a NEEDS_USERNAME middleware
        this.router.post("/", auth(), this.createConversation);
        this.router.get("/", auth(), this.getConversationPreviews);
        this.router.get("/:id/messages", auth(), this.getConversationMessages);
        // TODO: this endpoints needs a NEEDS_USERNAME middleware
        this.router.post("/:id/messages", auth(), this.sendMessage);
    }

    public createConversation = async (req: Request, res: Response) => {
        const conversationDto = parseConversationDto(req.body);

        const conversation = await this.conversationService.createConversation(
            req.user!.id,
            conversationDto
        );

        res.status(HttpStatus.Created).send(conversation.id);
    };

    public getConversationPreviews = async (req: Request, res: Response) => {
        const previews =
            await this.conversationService.getConversationPreviewsForUser(
                req.user!.id
            );

        res.json(previews);
    };

    public getConversationMessages = async (req: Request, res: Response) => {
        const conversationId = parseId(req.params);
        const cursor = parseCursor(req.query);

        const paginatedResponse =
            await this.conversationService.getMessagesForConversationPaginated(
                req.user!.id,
                conversationId,
                cursor
            );

        res.json({
            data: paginatedResponse.messages,
            count: paginatedResponse.totalCount,
        });
    };

    public sendMessage = async (req: Request, res: Response) => {
        const conversationId = parseId(req.params);
        const messageDto = parseMessageDto(req.body);

        const msg = await this.conversationService.sendMessage(
            messageDto,
            conversationId,
            req.user!.id
        );

        res.status(HttpStatus.Created).send(msg.id);
    };
}
