import type { PubSubEvent } from "../ws/event";

export default interface IPubSubService {
    publish<T>(channel: string, message: PubSubEvent<T>): Promise<number>;
    subscribe<T>(
        channel: string,
        callback: (message: PubSubEvent<T>) => void
    ): Promise<void>;
    unsubscribe(channel: string): Promise<void>;
}

export function buildAuctionChannelName(auctionId: string) {
    return `auction:${auctionId}`;
}
