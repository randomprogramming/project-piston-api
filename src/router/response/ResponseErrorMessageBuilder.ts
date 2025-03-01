import type { Response } from "express";
import HttpStatus from "../../HttpStatus";
import logger from "../../logger";

export default class ResponseErrorMessageBuilder {
    private static readonly ERR_CODE = "err";
    public static readonly INTERNAL_SERVER_ERROR =
        this.ERR_CODE + "::internal_server_error";

    private category: string;
    private details: string[] = [];

    private constructor(category: string) {
        this.category = category;
    }

    // Static factory methods for specific categories
    static account() {
        return new ResponseErrorMessageBuilder("account");
    }
    static auction() {
        return new ResponseErrorMessageBuilder("auction");
    }
    static bid() {
        return new ResponseErrorMessageBuilder("bid");
    }

    public getMessage(): string {
        return [
            ResponseErrorMessageBuilder.ERR_CODE,
            this.category,
            ...this.details,
        ].join("::");
    }

    /**
     * Add details about the error, and the details will be returned to the frontend, so do not include any sensitive info here
     * You can use @function log for logging sensitive info
     */
    public addDetail(...details: string[]) {
        this.details.push(...details);
        return this;
    }

    public log(msg: string): this;
    public log(msg: string, step: string): this;
    public log(msg: string, step?: string): this {
        let logMsg = "ResponseErrorMessageBuilder::" + this.getMessage();
        if (step) {
            logMsg += "@" + step;
        }
        logMsg += " | " + msg;

        logger.error(logMsg);
        return this;
    }

    public send(res: Response, status: HttpStatus = HttpStatus.BadRequest) {
        res.status(status).send(this.getMessage());
    }
}
