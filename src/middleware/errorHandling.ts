import type { NextFunction, Request, Response } from "express";
import logger from "../logger";
import { ZodError } from "zod";
import HttpStatus from "../HttpStatus";
import ResponseErrorMessageBuilder from "../router/response/ResponseErrorMessageBuilder";

export default function errorHandling() {
    return (err: Error, req: Request, res: Response, _next: NextFunction) => {
        if (err instanceof ZodError) {
            logger.error(
                `Validation Error: ${err}.\nBody: '${JSON.stringify(
                    req.body
                )}'.\nEndpoint: '${req.path}'.\nParams: '${JSON.stringify(
                    req.params
                )}'`
            );

            res.status(HttpStatus.BadRequest).json(err.errors);
            return;
        }

        logger.error(
            `Unknown exception: '${JSON.stringify(err)}'. Stack: '${err.stack}'`
        );
        res.status(HttpStatus.InternalServerError).send(
            ResponseErrorMessageBuilder.INTERNAL_SERVER_ERROR
        );
    };
}
