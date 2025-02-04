import { type Server as HttpServer } from "http";
import type { Socket } from "socket.io";
import type { MappedBid } from "../../router/response/bidMapping";
import WebSocketService from "./WebSocketService";
import logger from "../../logger";

export default class AuctionWebSocketService extends WebSocketService {
    public static readonly NAMESPACE = "/auction";

    constructor(server: HttpServer) {
        super(server, AuctionWebSocketService.NAMESPACE);
    }

    protected onConnection(socket: Socket) {
        socket.on("subscribe", (auctionId: string) => {
            socket.join(auctionId);
            logger.info(`Socket '${socket.id}' joined auction '${auctionId}'`);
        });

        socket.on("unsubscribe", (auctionId: string) => {
            socket.leave(auctionId);
        });
    }

    public emitNewCurrentBid(auctionId: string, data: MappedBid) {
        // TODO: Put update names in some sort of separate const file
        this.socketNamespace.to(auctionId).emit("current_bid_update", data);
    }
}
