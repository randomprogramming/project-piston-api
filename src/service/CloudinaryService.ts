import { v2 as cloudinary } from "cloudinary";
import logger from "../logger";
import {
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
    CLOUDINARY_CLOUD_NAME,
} from "../env";

export default class CloudinaryService {
    private static readonly UPLOAD_FORMAT = "webp";

    constructor() {
        logger.info("Configuring cloudinary service");
        cloudinary.config({
            cloud_name: CLOUDINARY_CLOUD_NAME,
            api_key: CLOUDINARY_API_KEY,
            api_secret: CLOUDINARY_API_SECRET,
        });
    }

    // TODO: We should be putting the images into a specific bucket for the auctionId, so that it is nicely sorted
    public authenticateCloudinary = () => {
        const timestamp = Math.round(new Date().getTime() / 1000);

        const toSign: any = {
            timestamp: timestamp,
            format: CloudinaryService.UPLOAD_FORMAT,
        };

        const signature = cloudinary.utils.api_sign_request(
            toSign,
            CLOUDINARY_API_SECRET
        );

        return {
            signature,
            timestamp,
            cloudname: CLOUDINARY_CLOUD_NAME,
            api_key: CLOUDINARY_API_KEY,
        };
    };
}
