import WebSocket from "ws";

const url = "ws://localhost:3010/live?assistant=Ria&voice=Kore";
console.log("Connecting WebSocket to:", url);

const ws = new WebSocket(url);

ws.on("open", () => {
  console.log("[Client WS] Connected to server bridge!");
});

ws.on("message", (data) => {
  console.log("[Client WS Message]:", data.toString());
});

ws.on("error", (err) => {
  console.error("[Client WS Error]:", err.message);
});

ws.on("close", (code, reason) => {
  console.log(`[Client WS Closed] Code: ${code}, Reason: ${reason.toString()}`);
});
