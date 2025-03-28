import type { NextFunction, Request, Response } from "express";
import logger from "../logger";
import { ZodError } from "zod";
import HttpStatus from "../HttpStatus";
import ResponseErrorMessageBuilder from "../router/response/ResponseErrorMessageBuilder";
import { DbError } from "../exception";

export default function errorHandling() {
    return (err: Error, req: Request, res: Response, _next: NextFunction) => {
        if (err instanceof ZodError) {
            logger.error(
                `ZodError: ${err}.\nBody: '${JSON.stringify(
                    req.body
                )}'.\nEndpoint: '${req.path}'.\nParams: '${JSON.stringify(
                    req.params
                )}'`
            );

            res.status(HttpStatus.BadRequest).json(err.errors);
            return;
        }
        if (err instanceof DbError) {
            return ResponseErrorMessageBuilder.db()
                .log(`DbError: ${err.message}. Stack: '${err.stack}'`)
                .send(res, HttpStatus.InternalServerError);
        }

        logger.error(
            `Unknown exception: '${JSON.stringify(err)}'. Stack: '${err.stack}'`
        );
        res.status(HttpStatus.InternalServerError).send(
            ResponseErrorMessageBuilder.INTERNAL_SERVER_ERROR
        );
    };
}
