import type { ImageStorage } from "./ImageStorage";
import fs from "fs";
import path from "path";
import logger from "../logger";

export default class LocalImageStorage implements ImageStorage {
    private readonly PUBLIC_FOLDER = "./public";
    private storageFolder: string;
    // When saving the files, we must save them to the "./public" folder, as that is the only
    // folder which publicly hosts static files
    private publicStorageFolder: string;

    constructor(storageFolder: string) {
        this.publicStorageFolder = this.PUBLIC_FOLDER + storageFolder;
        this.storageFolder = storageFolder;
        if (!fs.existsSync(this.publicStorageFolder)) {
            fs.mkdirSync(this.publicStorageFolder, { recursive: true });
        }
    }

    public async saveImage(
        bucket: string,
        fileName: string,
        imageBuffer: Buffer
    ): Promise<string> {
        const hostedPath = `${this.storageFolder}/${bucket}/${fileName}`;
        const relativePath = `${this.publicStorageFolder}/${bucket}/${fileName}`;
        const directory = path.dirname(relativePath);

        if (!fs.existsSync(directory)) {
            logger.info(`LocalImageStorage creating bucket at '${directory}'`);
            fs.mkdirSync(directory);
        }

        logger.info(`LocalImageStorage saving image to '${relativePath}'`);
        await fs.promises.writeFile(
            relativePath,
            imageBuffer as unknown as Uint8Array
        );
        return hostedPath;
    }
}
