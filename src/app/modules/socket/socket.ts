import { WebSocketServer } from "ws";


const webSocketServer = new WebSocketServer({
    port :8001,
})

webSocketServer.on("connection", (socket) => {
    console.log(socket);
});