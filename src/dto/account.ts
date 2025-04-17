import { z } from "zod";
import { email, username, validPassword } from "./sharedValidators";

const RegistrationData = z.object({
    email: email(),
    username: username(),
    password: validPassword(),
});

export function parseRegisterBody(obj: any) {
    return RegistrationData.parse(obj);
}
export type RegistrationDataDto = z.infer<typeof RegistrationData>;

/**
 * Handle may be either username or email
 */
const LoginData = z.object({
    handle: z.string(),
    password: z.string(),
});
export function parseLoginBody(obj: any) {
    return LoginData.parse(obj);
}

const UsernameSchema = z.object({
    username: z.string(),
});
export function parseUsername(obj: any) {
    return UsernameSchema.parse(obj).username;
}
