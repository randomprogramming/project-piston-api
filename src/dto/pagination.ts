import { z } from "zod";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 32;

const PaginationRequestSchema = z.object({
    page: z.number().int().positive().default(DEFAULT_PAGE),
    cursor: z.string().optional(),
    pageSize: z
        .number()
        .int()
        .positive()
        .max(MAX_PAGE_SIZE)
        .default(DEFAULT_PAGE_SIZE),
});
export type PaginationRequest = z.infer<typeof PaginationRequestSchema>;

export function parsePaginationRequest(obj: any) {
    return PaginationRequestSchema.parse(obj);
}
