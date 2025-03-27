import type { Request, Response } from "express";
import type ConversationService from "../service/ConversationService";
import BaseRouter, { API_VERSION } from "./BaseRouter";

export default class ConversationRouter extends BaseRouter {
    constructor(private conversationService: ConversationService) {
        super(API_VERSION.V1, "/conversations");
    }
}
