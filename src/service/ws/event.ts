export enum EventName {
    NEW_COMMENT_OR_BID_EVENT = "new_comment_or_bid",
}

export type PubSubEvent<T> = { eventName: EventName } & T;

export function buildPubSubEvent<T>(
    obj: T,
    eventName: EventName
): PubSubEvent<T> {
    return { ...obj, eventName };
}
