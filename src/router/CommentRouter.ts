import type { Request, Response } from "express";
import type CommentRepository from "../repository/CommentRepository";
import type AuctionWebSocketService from "../service/ws/AuctionWebSocketService";
import BaseRouter, { API_VERSION } from "./BaseRouter";
import { parseId } from "../dto/common";
import { parsePaginationRequest } from "../dto/pagination";
import { parseCommentDto } from "../dto/comment";
import HttpStatus from "../HttpStatus";
import { auth } from "../util/auth/middleware";

export default class CommentRouter extends BaseRouter {
    constructor(
        private commentRepo: CommentRepository,
        private auctionWSService: AuctionWebSocketService
    ) {
        super(API_VERSION.V1, "/comments");

        this.router.post("/auction/:id", auth(), this.submitComment);
        this.router.get("/auction/:id", this.getAuctionCommentsAndBids);
    }

    public submitComment = async (req: Request, res: Response) => {
        const auctionId = parseId(req.params);
        const commentDto = parseCommentDto(req.body);

        const newComment = await this.commentRepo.create(
            req.user!.id,
            auctionId,
            commentDto
        );

        this.auctionWSService.emitNewComment(auctionId, {
            id: newComment.id,
            // TODO: Make sure username is not null with a "needsUsername" middleware
            username: req.user!.username!,
            content: newComment.content,
            createdAt: newComment.createdAt,
            type: "comment",
        });

        res.status(HttpStatus.Created).send();
    };

    public getAuctionCommentsAndBids = async (req: Request, res: Response) => {
        const auctionId = parseId(req.params);
        const paginationReq = parsePaginationRequest(req.query);

        const resp = await this.commentRepo.getCommentsAndBids(
            auctionId,
            paginationReq.pageSize,
            paginationReq.cursor
        );

        res.json(resp);
    };
}
