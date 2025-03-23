import type { Request, Response } from "express";
import type LocationRepository from "../repository/LocationRepository";
import BaseRouter, { API_VERSION } from "./BaseRouter";
import { parseQ } from "../dto/common";
import { auth } from "../util/auth/middleware";

export default class LocationRouter extends BaseRouter {
    constructor(private locationRepo: LocationRepository) {
        super(API_VERSION.V1, "/locations");

        this.router.get("/country/auction-count", this.getAuctionCountByCountr);
        this.router.get("/city", auth(), this.searchCities);
    }

    public searchCities = async (req: Request, res: Response) => {
        const q = parseQ(req.query);
        const cities = await this.locationRepo.findCitiesByQuery(q);

        res.json(
            cities.map((c) => {
                return {
                    id: c.id,
                    name: c.name,
                    countryCode: c.countryCode,
                };
            })
        );
    };

    public getAuctionCountByCountr = async (_req: Request, res: Response) => {
        // TODO: Cache this
        const autionCountByCountry =
            await this.locationRepo.findLiveAuctionCountByCountry();

        res.json(autionCountByCountry);
    };
}
