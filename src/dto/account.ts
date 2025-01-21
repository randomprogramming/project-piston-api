import { z } from "zod";
import {
    email,
    nullableString,
    username,
    validPassword,
} from "./sharedValidators";

const RegistrationData = z.object({
    email: email(),
    username: username(),
    password: validPassword(),
    // TODO: I don't think we need first and last names
    firstName: nullableString(),
    lastName: nullableString(),
});

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
