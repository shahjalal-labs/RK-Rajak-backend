import { WebSocketServer, WebSocket } from "ws";

let wss: WebSocketServer;

export function setUpWebSocketServer(server: any) {
  console.log("✅ WebSocket server initialized!");
  wss = new WebSocketServer({
    server,
  });

  wss.on("connection", async (ws, req) => {
    console.log("✅ New client connected");

    ws.send(
      JSON.stringify({ type: "connection", message: "Connected successfully" })
    );

    ws.on("close", () => {
      console.log("❌ Client disconnected");
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });
}

/**
 * Broadcast message to all connected WebSocket clients
 */
export function broadcastMessage(type: string, data: any) {
    console.log(`hit the brodcast functions!!`)
  if (!wss) {
    console.warn("WebSocket server not initialized");
    return;
  }

  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString(),
  });

  let sentCount = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        sentCount++;
      } catch (error) {
        console.error("Error sending message to client:", error);
      }
    }
  });

  console.log(`📤 Broadcast "${type}" to ${sentCount} client(s)`);
}
