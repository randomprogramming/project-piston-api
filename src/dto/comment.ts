import { z } from "zod";

export const CommentDto = z.object({
    content: z.string().min(1).max(420),
});
export type CommentDto = z.infer<typeof CommentDto>;

export function parseCommentDto(obj: any) {
    return CommentDto.parse(obj);
}
