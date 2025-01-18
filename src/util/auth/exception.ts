import type { Request } from "express";

export class InvalidJwtPayload extends Error {
    constructor(payload: any) {
        super(`'${JSON.stringify(payload)}' is not a valid JWT payload`);
    }
}

export class RequestNoUser extends Error {
    constructor(request: Request) {
        super(
            `Request arrived without a defined req.user. Request: ${JSON.stringify(
                request
            )}`
        );
    }
}
