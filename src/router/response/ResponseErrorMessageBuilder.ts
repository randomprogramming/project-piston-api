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

    private getMessage(): string {
        return [
            ResponseErrorMessageBuilder.ERR_CODE,
            this.category,
            ...this.details,
        ].join("::");
    }

    public addDetail(...details: string[]) {
        this.details.push(...details);
        return this;
    }

    public log(step?: string, msg?: string) {
        let logMsg = "ResponseErrorMessageBuilder::" + this.getMessage();
        if (step) {
            logMsg += "@" + step;
        }
        if (msg) {
            logMsg += " | " + msg;
        }

        logger.error(logMsg);
        return this;
    }

    public send(res: Response) {
        res.status(HttpStatus.BadRequest).send(this.getMessage());
    }
}
