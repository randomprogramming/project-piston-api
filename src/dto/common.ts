import { z } from "zod";

const IdSchema = z.object({
    id: z.string(),
});
export function parseId(obj: any) {
    return IdSchema.parse(obj).id;
}
