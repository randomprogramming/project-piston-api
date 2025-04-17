import type { Request, Response } from "express";
import type AccountService from "../service/AccountService";
import BaseRouter, { API_VERSION } from "./BaseRouter";
import { parseUsername } from "../dto/account";
import HttpStatus from "../HttpStatus";
import { parseCursor } from "../dto/common";
import { mapBasicAuctions } from "./response/auctionMapping";

export default class AccountRouter extends BaseRouter {
    constructor(private accountService: AccountService) {
        super(API_VERSION.V1, "/accounts");

        this.router.get("/username/:username", this.getAccountPublicInfo);
        this.router.get(
            "/username/:username/auctions",
            this.getAccountNonLiveAuctions
        );
        this.router.get(
            "/username/:username/auctions/live",
            this.getAccountLiveAuctions
        );
    }

    public getAccountPublicInfo = async (req: Request, res: Response) => {
        const username = parseUsername(req.params);
        const publicData =
            await this.accountService.getPublicAccountInformation(username);

        if (!publicData) {
            res.status(HttpStatus.NotFound).send();
            return;
        }

        res.json(publicData);
    };

    public getAccountNonLiveAuctions = async (req: Request, res: Response) => {
        const username = parseUsername(req.params);
        const cursor = parseCursor(req.query);
        const paginatedAuctions = await this.accountService.getEndedAuctions(
            username,
            cursor
        );

        res.json({
            data: mapBasicAuctions(paginatedAuctions.data),
            next: paginatedAuctions.next,
        });
    };

    public getAccountLiveAuctions = async (req: Request, res: Response) => {
        const username = parseUsername(req.params);
        const auctions = await this.accountService.getLiveAuctions(username);

        res.json(mapBasicAuctions(auctions));
    };
}
