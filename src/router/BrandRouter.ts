import type { Request, Response } from "express";
import type BrandRepository from "../repository/BrandRepository";
import BaseRouter, { API_VERSION } from "./BaseRouter";
import { parseId, parseQ } from "../dto/common";

export default class BrandRouter extends BaseRouter {
    constructor(private brandRepo: BrandRepository) {
        super(API_VERSION.V1, "/brands");

        this.router.get("/", this.getBrands);
        this.router.get("/:id/models", this.getModels);
    }

    public getBrands = async (req: Request, res: Response) => {
        const q = parseQ(req.query);

        const brands = await this.brandRepo.findManyBrandsByName(q);

        res.json(brands);
    };

    public getModels = async (req: Request, res: Response) => {
        const brandName = parseId(req.params);

        const models = await this.brandRepo.findManyModelsForBrand(brandName);

        res.json(models);
    };
}
