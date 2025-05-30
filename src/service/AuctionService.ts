import type AuctionRepository2 from "../repository/AuctionRepository2";
import type {
    AuctionDto,
    AuctionPatchData,
    PaginatedAuctionQueryDto,
} from "../dto/auction";
import type { MediaUploadDto } from "../dto/media";
import type MediaRepository from "../repository/MediaRepository";
import type BidService from "./BidService";
import {
    AuctionState,
    ContactType,
    Prisma,
    type Auction,
    type AuctionCarInformation,
} from "@prisma/client";
import { Err, Ok, type Result } from "../result";
import logger from "../logger";
import { hashDate } from "../util/date";
import ResponseErrorMessageBuilder from "../router/response/ResponseErrorMessageBuilder";
import { sanitizeURLString } from "../util/url";
import { FEATURED_AUCTIONS_COUNT } from "../env";

export default class AuctionService {
    private readonly AUCTION_EXTENSION_CUTOFF_MS = 5 * 60 * 1000;

    constructor(
        private auctionRepo: AuctionRepository2,
        private mediaRepo: MediaRepository,
        private bidService: BidService
    ) {}

    private generatePrettyId = (info: Omit<AuctionCarInformation, "vin">) => {
        const nameArr: string[] = [];
        nameArr.push(info.modelYear.toString());

        if (info.carBrandName) {
            nameArr.push(info.carBrandName);
        } else {
            nameArr.push(info.ueCarBrand);
        }

        if (info.carModelName) {
            nameArr.push(info.carModelName);
        } else {
            nameArr.push(info.ueCarModel);
        }

        if (info.trim?.length) {
            nameArr.push(info.trim);
        }
        // Adding a random set of characters to the URL to avoid duplicates
        nameArr.push(hashDate(new Date()));

        const str = nameArr.join("-");
        const sanitized = sanitizeURLString(str);
        return sanitized.toLowerCase();
    };

    public submitAuction = async (dto: AuctionDto, sellerId: string) => {
        if (dto.contactDetails.type === ContactType.DEALER) {
            if (
                !dto.contactDetails.dealerName ||
                dto.contactDetails.dealerName.length === 0
            ) {
                return Err(
                    ResponseErrorMessageBuilder.auction()
                        .addDetail("dealerName", "missing")
                        .log(
                            "contactDetails is DEALER, but dealerName isn't supplied.",
                            "submitAuction"
                        )
                        .getMessage()
                );
            }
        } else if (dto.contactDetails.type === ContactType.PRIVATE) {
            if (
                !dto.contactDetails.name ||
                dto.contactDetails.name.length === 0
            ) {
                return Err(
                    ResponseErrorMessageBuilder.auction()
                        .addDetail("name", "missing")
                        .log(
                            "contactDetails is PRIVATE, but name isn't supplied.",
                            "submitAuction"
                        )
                        .getMessage()
                );
            }
        } else {
            throw new Error(
                `ContactType not supported: ${dto.contactDetails.type}`
            );
        }

        const auction = await this.auctionRepo.submit(
            sellerId,
            dto.carInformation,
            dto.contactDetails
        );

        return Ok(auction);
    };

    public editAuction = async (
        id: string,
        accountId: string,
        patchableAuctionDto: AuctionPatchData,
        hasAccess?: boolean
    ) => {
        const auction = await this.auctionRepo.findById(id);

        // The function caller can determine if the user has access to it
        // (for instance, an admin should be able to edit any auction at any point)
        if (!hasAccess && auction?.sellerId === accountId) {
            // Otherwise, check business logic if the requestor may do editing
            // If the auction belongs to this user, they can edit it only in specific stages
            if (
                auction.state === AuctionState.SUBMITTED ||
                auction.state === AuctionState.PENDING_CHANGES
            ) {
                hasAccess = true;
            }
        }

        if (!hasAccess) {
            return Err(
                ResponseErrorMessageBuilder.auction()
                    .addDetail("not_found")
                    .log(
                        `Account '${accountId}' doesn't have access to edit '${auction?.id}'.`,
                        "editAuction"
                    )
                    .getMessage()
            );
        }

        const updatedAuction = await this.auctionRepo.updateAuction(id, {
            contactDetails: {
                update: patchableAuctionDto.contactDetails,
            },
            carInformation: {
                update: patchableAuctionDto.carInformation,
            },
        });
        return Ok(updatedAuction);
    };

    public auctionGoLive = async (
        id: string
    ): Promise<Result<undefined, string>> => {
        const auction = await this.auctionRepo.findByIdIncludeCarInformation(
            id
        );

        if (!auction) {
            return Err(
                ResponseErrorMessageBuilder.auction()
                    .addDetail("not_found")
                    .log(`Couldn't find auction '${id}'`, "auctionGoLive")
                    .getMessage()
            );
        }

        if (auction.state !== AuctionState.UNDER_REVIEW) {
            return Err(
                ResponseErrorMessageBuilder.auction()
                    .addDetail("invalid_state")
                    .log(
                        `Expected state UNDER_REVIEW, found '${auction.state}'`,
                        "auctionGoLive"
                    )
                    .getMessage()
            );
        }

        const liveFeaturedAuctionCount =
            await this.auctionRepo.countLiveFeaturedAuctions();

        const prettyId = this.generatePrettyId(auction.carInformation);
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);

        await this.auctionRepo.auctionGoLive(id, {
            prettyId,
            startDate,
            endDate,
            // If we don't have enough featured auctions live right now, by default make this new one featured
            featured: liveFeaturedAuctionCount < FEATURED_AUCTIONS_COUNT,
        });
        logger.info(
            `Auction '${auction.id}' is live with prettyId '${prettyId}'`
        );
        return Ok();
    };

    /**
     * Get the public view of an auction.
     */
    public getAuction = async (prettyId: string) => {
        return this.auctionRepo.getFull({ prettyId });
    };

    public getAuctionById = async (id: string) => {
        return this.auctionRepo.getFull({ id });
    };

    public getAuctionsPaginated = async (q: PaginatedAuctionQueryDto) => {
        return this.auctionRepo.findManyLiveBasicPaginated(q);
    };

    public getAuctionsOfSeller = async (sellerId: string) => {
        return this.auctionRepo.findManyFullPaginated({
            sellerId,
        });
    };

    /**
     * Accept a submitted auction. Meaning, move it to "PENDING_CHANGES" but only if it was in the "SUBMITTED" state
     * Also update the car brand and car model fields in the AuctionCarInformation
     * This will create the car model or car brand rows in the db if they don't already exist for that model/brand
     */
    public acceptSubbmittedAuction = async (id: string) => {
        return this.auctionRepo.acceptSubmittedAndCreateCarModel(id);
    };

    public addMedia = async (
        id: string,
        sellerId: string,
        mediaUploadDto: MediaUploadDto
    ): Promise<Result<undefined, string>> => {
        const auction = await this.auctionRepo.findAuctionForUploadingMedia(
            id,
            sellerId
        );
        if (!auction) {
            return Err("not_found");
        }
        // Submitted auctions may only have 1 photo in the beggining, and then we later ask for more photos
        if (
            auction.state === AuctionState.SUBMITTED &&
            auction._count.media > 0
        ) {
            return Err("submitted_auction_already_has_media");
        }
        // TODO: Make this 200 a env variable
        if (auction._count.media + mediaUploadDto.media.length > 200) {
            return Err("too_many_photos");
        }

        const existingMediaCount = await this.mediaRepo.countForAuctionAndGroup(
            auction.id,
            mediaUploadDto.group
        );
        await this.mediaRepo.createManyForAuction(
            id,
            mediaUploadDto.group,
            mediaUploadDto.media,
            existingMediaCount
        );
        return Ok();
    };

    public processEndedAuctions = async () => {
        const auctions = await this.auctionRepo.findAuctionsToEnd();

        for (const auction of auctions) {
            logger.info(`Marking auction '${auction.id}' as ENDED`);
            const { count: updateCount } =
                await this.auctionRepo.updateAuctionStateToEnded(auction.id);
            if (updateCount === 0) {
                logger.info(
                    `Seems like the auction '${auction.id}' is alredy in the ENDED state, skipping it...`
                );
                continue;
            }

            // Retry mechanism for marking the winning bid
            let retryCount = 0;
            let success = false;
            while (retryCount < 3 && !success) {
                try {
                    await this.bidService.markWinningBid(auction.id);
                    success = true;
                } catch (error) {
                    retryCount++;
                    logger.warn(
                        `Failed to mark winning bid for auction '${
                            auction.id
                        }' (Attempt ${retryCount}/3). Error: ${JSON.stringify(
                            error
                        )}`
                    );

                    if (retryCount < 3) {
                        logger.warn(`Retrying in 2 seconds...`);
                        await new Promise((resolve) =>
                            setTimeout(resolve, 2000)
                        );
                    } else {
                        // TODO: Send email or raise alert here!
                        logger.error(
                            `Failed to mark winning bid after 3 attempts for auction '${auction.id}'`
                        );
                    }
                }
            }
        }
    };

    public findByIdLockRowTxn = (txn: Prisma.TransactionClient, id: string) => {
        return this.auctionRepo.findByIdLockRowTxn(txn, id);
    };

    /**
     * Checks if an auctions end time needs to be updated, to prevent sniping.
     * If it is, calculate new end time and update the auction.
     */
    public async extendAuctionEndTime(
        tx: Prisma.TransactionClient,
        auction: Auction,
        now: Date
    ) {
        if (!auction.endDate) {
            logger.error(
                `Trying to extend auction which doesn't have end time, auction ID: '${auction.id}'`
            );
            return;
        }

        const timeRemaining = auction.endDate.getTime() - now.getTime();
        if (timeRemaining >= this.AUCTION_EXTENSION_CUTOFF_MS) {
            logger.info(
                `Auction '${auction.id}' does not need extension. Remaining time (${timeRemaining}ms) is more than cutoff (${this.AUCTION_EXTENSION_CUTOFF_MS}ms)`
            );
            return;
        }

        const newEndDate = new Date(
            auction.endDate.getTime() + this.AUCTION_EXTENSION_CUTOFF_MS
        );
        logger.info(
            `Extending auction '${auction.id}' to '${newEndDate.toISOString()}'`
        );
        await this.auctionRepo.updateAuction(
            auction.id,
            { endDate: newEndDate },
            tx
        );
    }
}
