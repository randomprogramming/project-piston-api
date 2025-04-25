import type { Request, Response } from "express";
import BaseRouter, { API_VERSION } from "./BaseRouter";
import { NODE_NAME } from "../env";

export default class PingRouter extends BaseRouter {
    constructor() {
        super(API_VERSION.V1, "/ping");

        this.router.get("/", this.ping);
    }

    public ping = async (_req: Request, res: Response) => {
        res.send(`Pong from ${NODE_NAME}`);
    };
}
