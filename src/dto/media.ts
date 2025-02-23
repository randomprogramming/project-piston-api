import z from "zod";
import { ImageGroup } from "@prisma/client";
import { url } from "./sharedValidators";

const MediaDtoSchema = z.object({
    url: url(),
});
export type MediaDto = z.infer<typeof MediaDtoSchema>;

const MediaUploadDto = z.object({
    group: z.nativeEnum(ImageGroup),
    media: z.array(z.lazy(() => MediaDtoSchema)),
});
export function parseMediaUploadDto(obj: any) {
    return MediaUploadDto.parse(obj);
}
export type MediaUploadDto = z.infer<typeof MediaUploadDto>;
