export interface ImageStorage {
    /**
     * @param bucket Name of the bucket(folder) where to save the image
     * @returns relative path of the saved image: '/images/auctions/auction-id-1/image1.jpg'
     *
     * Use "AUCTION_IMAGE_HOST" env variable to get the full path of the image
     */
    saveImage(
        bucket: string,
        fileName: string,
        imageBuffer: Buffer
    ): Promise<string>;
}
