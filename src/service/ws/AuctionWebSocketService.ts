import type { Server as SocketServer, Socket, Namespace } from "socket.io";
import type { CommentOrBid } from "../../dto/commentOrBid";
import type IPubSubService from "../pubsub/IPubSubService";
import logger from "../../logger";
import { buildPubSubEvent, EventName, type PubSubEvent } from "./event";
import { buildAuctionChannelName } from "../pubsub/IPubSubService";

/**
 * Accepts a socket connection, and then listens on the pub sub service for auction updates, and propagates them to
 * the socket. This allows us to horizontally scale the app.
 */
export default class AuctionWebSocketService {
    public static readonly NAMESPACE = "/auction";

    protected socketNamespace: Namespace;

    constructor(io: SocketServer, private pubSub: IPubSubService) {
        this.socketNamespace = io.of(AuctionWebSocketService.NAMESPACE);

        this.socketNamespace.on("connection", (socket: Socket) => {
            socket.on("subscribe", async (auctionId: string) => {
                socket.join(auctionId);

                await pubSub.subscribe<CommentOrBid>(
                    buildAuctionChannelName(auctionId),
                    this.onPubSubMessage
                );

                logger.info(
                    `Socket '${socket.id}' subscribed to auction '${auctionId}'`
                );
            });

            socket.on("unsubscribe", async (auctionId: string) => {
                await pubSub.unsubscribe(buildAuctionChannelName(auctionId));
                socket.leave(auctionId);
            });
        });
    }

    private onPubSubMessage = (message: PubSubEvent<CommentOrBid>) => {
        if (message.eventName === EventName.NEW_COMMENT_OR_BID_EVENT) {
            this.socketNamespace
                .to(message.auctionId)
                .emit(EventName.NEW_COMMENT_OR_BID_EVENT, message);
        }
    };

    public emitNewCommentOrBid = async (
        auctionId: string,
        cob: CommentOrBid
    ) => {
        await this.pubSub.publish(
            buildAuctionChannelName(auctionId),
            buildPubSubEvent(cob, EventName.NEW_COMMENT_OR_BID_EVENT)
        );
    };
}
