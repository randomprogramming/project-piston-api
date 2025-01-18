import type { JWTPayload } from "./jwt";

declare global {
    namespace Express {
        /**
         * Override the default Express User field to include our custom fields
         */
        interface User extends JWTPayload {}
    }
}
