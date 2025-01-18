import { z } from "zod";
import {
    email,
    nullableString,
    username,
    validPassword,
} from "./sharedValidators";

const RegistrationData = z
    .object({
        email: email(),
        username: username(),
        password: validPassword(),
        confirmPassword: validPassword(),
        // TODO: I don't think we need first and last names
        firstName: nullableString(),
        lastName: nullableString(),
    })
    .superRefine(({ confirmPassword, password }, ctx) => {
        if (confirmPassword !== password) {
            ctx.addIssue({
                code: "custom",
                message: "not_matching",
                path: ["confirmPassword"],
            });
        }
    });
/**
 * Parse registration body, and also confirms that the password and confirmPassword are matching
 */
export function parseRegisterBody(obj: any) {
    return RegistrationData.parse(obj);
}
export type RegistrationDataDto = z.infer<typeof RegistrationData>;

const LoginData = z.object({
    email: email(),
    password: z.string(),
});
export function parseLoginBody(obj: any) {
    return LoginData.parse(obj);
}
