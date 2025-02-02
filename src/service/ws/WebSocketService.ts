import { type Server as HttpServer } from "http";
import { type Namespace, type Socket, Server as SocketServer } from "socket.io";

export default abstract class WebSocketService {
    protected socketNamespace: Namespace;

    constructor(private server: HttpServer, namespace: string) {
        const io = new SocketServer(this.server, {
            cors: {
                // TODO: what do we need here?
                origin: "*",
            },
        });
        // Disable the default '/' namespace
        io.use((_, next) => next(new Error("not_used")));

        this.socketNamespace = io.of(namespace);
        this.socketNamespace.on("connection", this.onConnection);
    }

    protected abstract onConnection(socket: Socket): void;
}
