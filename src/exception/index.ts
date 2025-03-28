export class DbError extends Error {
    constructor(payload: string) {
        super(payload);
    }
}
