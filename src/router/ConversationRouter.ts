import type { Request, Response } from "express";
import type ConversationService from "../service/ConversationService";
import BaseRouter, { API_VERSION } from "./BaseRouter";
import { auth } from "../util/auth/middleware";
import { parseConversationDto } from "../dto/conversation";
import HttpStatus from "../HttpStatus";

export default class ConversationRouter extends BaseRouter {
    constructor(private conversationService: ConversationService) {
        super(API_VERSION.V1, "/conversations");

        this.router.post("/", auth(), this.createConversation);

        // this.router.get(
        //     "/:id",
        //     auth(),
        //     async (req: Request, res: Response) => {}
        // );

        // this.router.get(
        //     "/account/:accountId",
        //     auth(),
        //     async (req: Request, res: Response) => {}
        // );

        // this.router.post(
        //     "/:id/messages",
        //     auth(),
        //     async (req: Request, res: Response) => {}
        // );

        // this.router.get(
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
}
