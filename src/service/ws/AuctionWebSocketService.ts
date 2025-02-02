import { type Server as HttpServer } from "http";
import type { Socket } from "socket.io";
import WebSocketService from "./WebSocketService";

export default class AuctionWebSocketService extends WebSocketService {
    public static readonly NAMESPACE = "/auction";

    constructor(server: HttpServer) {
        super(server, AuctionWebSocketService.NAMESPACE);
    }

    protected onConnection(socket: Socket) {
        console.log("User connected", socket.id);

        socket.on("subscribe", (auctionId: string) => {
            socket.join(auctionId);
            console.log(`User ${socket.id} joined auction ${auctionId}`);
        });

        socket.on("unsubscribe", (auctionId: string) => {
            socket.leave(auctionId);
            console.log(`User ${socket.id} left auction ${auctionId}`);
        });
    }

    /**
     * Emit an update to all users in a specific auction room.
     */
    // public emitAuctionUpdate(auctionId: string, data: any) {
    //     this.socketNamespace.to(auctionId).emit("auctionUpdate", data);
    // }
}
