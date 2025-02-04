import { z } from "zod";

const BidDtoSchema = z.object({
    // In cents!
    amount: z.coerce.number().int().min(0),
});

export function parseBidDto(obj: any) {
    return BidDtoSchema.parse(obj);
}
export type BidDto = z.infer<typeof BidDtoSchema>;
