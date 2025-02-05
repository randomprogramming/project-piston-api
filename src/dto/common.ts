import { z } from "zod";

const IdSchema = z.object({
    id: z.string(),
});
export function parseId(obj: any) {
    return IdSchema.parse(obj).id;
}

const PrettyIdSchema = z.object({
    pretty_id: z.string(),
});
export function parsePrettyId(obj: any) {
    return PrettyIdSchema.parse(obj)["pretty_id"];
}
