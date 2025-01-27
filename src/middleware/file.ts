import type { Request } from "express";
import multer, { type FileFilterCallback } from "multer";
import logger from "../logger";

const imageFileFilter = (
    _req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        logger.error(
            `Unsuported file type '${file.mimetype}' in imageFileFilter`
        );
        cb(new Error("err::unsupported_file") as any, false);
    }
};

const imageUpload = multer({
    limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
    fileFilter: imageFileFilter,
});

export { imageUpload };
