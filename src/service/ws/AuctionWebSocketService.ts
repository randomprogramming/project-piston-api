import type { Server as SocketServer, Socket, Namespace } from "socket.io";
import type { MappedBid } from "../../router/response/bidMapping";
import logger from "../../logger";

export default class AuctionWebSocketService {
    public static readonly NAMESPACE = "/auction";

    protected socketNamespace: Namespace;

    constructor(io: SocketServer) {
        this.socketNamespace = io.of(AuctionWebSocketService.NAMESPACE);

        this.socketNamespace.on("connection", (socket: Socket) => {
            socket.on("subscribe", (auctionId: string) => {
                socket.join(auctionId);
                logger.info(
                    `Socket '${socket.id}' joined auction '${auctionId}'`
                );
            });

            socket.on("unsubscribe", (auctionId: string) => {
                socket.leave(auctionId);
            });
        });
    }

    public emitNewCurrentBid(auctionId: string, data: MappedBid) {
        this.socketNamespace.to(auctionId).emit("current_bid_update", data);
    }
}
