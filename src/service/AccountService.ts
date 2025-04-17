import type AccountRepository from "../repository/AccountRepository";
import type AuctionRepository2 from "../repository/AuctionRepository2";
import logger from "../logger";

export default class AccountService {
    constructor(
        private accountRepo: AccountRepository,
        private auctionRepo: AuctionRepository2
    ) {}

    public getPublicAccountInformation = async (username: string) => {
        const account = await this.accountRepo.findByUsernameCaseInsensitive(
            username
        );
        if (!account) {
            logger.error(`Didn't find account with username '${username}'`);
            return null;
        }

        return {
            id: account.id,
            username: account.username,
            createdAt: account.createdAt,
        };
    };

    public getLiveAuctions = async (username: string) => {
        const account = await this.accountRepo.findByUsernameCaseInsensitive(
            username
        );
        if (!account) {
            return [];
        }

        return this.auctionRepo.findLiveAuctionsForSeller(account.id);
    };

    public getEndedAuctions = async (username: string, cursorId?: string) => {
        const account = await this.accountRepo.findByUsernameCaseInsensitive(
            username
        );
        if (!account) {
            return [];
        }

        return this.auctionRepo.findEndedAuctionsForSellerPaginated(
            account.id,
            cursorId
        );
    };
}
