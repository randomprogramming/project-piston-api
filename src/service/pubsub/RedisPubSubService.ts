import type IPubSubService from "./IPubSubService";
import Redis from "ioredis";

export default class RedisPubSubService implements IPubSubService {
    private publisher: Redis;
    private subscriber: Redis;

    constructor() {
        this.publisher = new Redis();
        this.subscriber = new Redis();
    }

    public publish = async (
        channel: string,
        message: object
    ): Promise<number> => {
        return await this.publisher.publish(channel, JSON.stringify(message));
    };

    public subscribe = async <T>(
        channel: string,
        callback: (message: T) => void
    ): Promise<void> => {
        await this.subscriber.subscribe(channel);
        this.subscriber.on("message", (c, msg) => {
            if (c === channel) {
                callback(JSON.parse(msg));
            }
        });
    };

    public unsubscribe = async (channel: string): Promise<void> => {
        await this.subscriber.unsubscribe(channel);
    };
}
