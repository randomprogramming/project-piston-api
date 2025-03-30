import type { Request, Response } from "express";
import type ConversationService from "../service/ConversationService";
import BaseRouter, { API_VERSION } from "./BaseRouter";
import { auth } from "../util/auth/middleware";
import { parseConversationDto } from "../dto/conversation";
import HttpStatus from "../HttpStatus";
import { parseCursor, parseId } from "../dto/common";

export default class ConversationRouter extends BaseRouter {
    constructor(private conversationService: ConversationService) {
        super(API_VERSION.V1, "/conversations");

        this.router.post("/", auth(), this.createConversation);
        this.router.get("/", auth(), this.getConversationPreviews);
        this.router.get("/:id/messages", auth(), this.getConversationMessages);

        // this.router.post(
        //     "/:id/messages",
        //     auth(),
        //     async (req: Request, res: Response) => {}
        // );
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
}
