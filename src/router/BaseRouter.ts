import { Router, type IRouter } from "express";

export enum API_VERSION {
    V1 = "/v1",
    V2 = "/v2",
}

export default abstract class BaseRouter {
    protected router: IRouter;
    private path: string;
    private apiVersion: API_VERSION;

    constructor(apiVersion: API_VERSION, path: string) {
        this.router = Router();
        this.apiVersion = apiVersion;
        this.path = this.apiVersion + path;
    }

    public getRouter = () => {
        return this.router;
    };

    public getPath = () => {
        return this.path;
    };
}
