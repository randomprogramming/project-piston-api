import { type Server as HttpServer } from "http";
import type IPubSubService from "../pubsub/IPubSubService";
import { Server as SocketServer } from "socket.io";
import AuctionWebSocketService from "./AuctionWebSocketService";

export default class WebSocketManager {
    private io: SocketServer;
    private _auctionWS: AuctionWebSocketService;

    constructor(server: HttpServer, pubSubService: IPubSubService) {
        this.io = new SocketServer(server, {
            cors: {
                // TODO: what do we need here?
                origin: "*",
            },
        });

        // Disable default "/" namespace
        this.io.use((_, next) => next(new Error("not_used")));

        this._auctionWS = new AuctionWebSocketService(this.io, pubSubService);
    }

    public auctionWS() {
        return this._auctionWS;
    }
}
