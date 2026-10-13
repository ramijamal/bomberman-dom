import { WebSocketServer } from 'ws';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameServer } from './server/GameServer.js';
import { createStaticHandler } from './server/staticFiles.js';

const root = path.dirname(fileURLToPath(import.meta.url));

export function createServer() {
  const httpServer = http.createServer(createStaticHandler(root));
  const wss = new WebSocketServer({ server: httpServer, maxPayload: 4096 });
  const game = new GameServer();

  wss.on('connection', (ws, request) => {
    // Browser connections must originate from the same host as this game.
    if (request.headers.origin) {
      try {
        const origin = new URL(request.headers.origin);
        if (!['http:', 'https:'].includes(origin.protocol) || origin.host !== request.headers.host) {
          ws.close(1008, 'Invalid origin');
          return;
        }
      } catch {
        ws.close(1008, 'Invalid origin');
        return;
      }
    }
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    let windowStart = Date.now(), messages = 0, lastChat = 0;
    ws.on('message', (data, isBinary) => {
      const now = Date.now();
      if (now - windowStart >= 1000) { windowStart = now; messages = 0; }
      if (++messages > 100) {
        ws.close(1008, 'Too many messages');
        return;
      }
      if (isBinary) { game.reject(ws, 'Only JSON text messages are supported'); return; }
      let message;
      try { message = JSON.parse(data.toString()); }
      catch { game.reject(ws, 'Invalid JSON'); return; }
      if (!message || typeof message !== 'object' || Array.isArray(message)) {
        game.reject(ws, 'Invalid message');
        return;
      }
      switch (message.type) {
        case 'JOIN': game.addPlayer(ws, message.nickname); break;
        case 'PLAYER_MOVE':
          if (!['up', 'down', 'left', 'right'].includes(message.direction)) game.reject(ws, 'Invalid direction');
          else game.handlePlayerMove(ws, message.direction);
          break;
        case 'PLACE_BOMB': game.handlePlaceBomb(ws); break;
        case 'CHAT':
          if (now - lastChat < 300) { game.reject(ws, 'Please wait before sending another message'); break; }
          if (typeof message.message !== 'string' || message.message.length > 200) { game.reject(ws, 'Chat messages must be 1–200 characters'); break; }
          lastChat = now;
          game.handleChat(ws, message.message);
          break;
        default: game.reject(ws, 'Unknown message type');
      }
    });
    ws.on('close', () => game.removePlayer(ws));
    ws.on('error', () => { game.removePlayer(ws); ws.terminate(); });
  });

  // Detect broken connections even when a browser never sends a close frame.
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) ws.terminate();
      else { ws.isAlive = false; ws.ping(); }
    }
  }, 30000);
  heartbeat.unref();
  wss.on('close', () => { clearInterval(heartbeat); game.dispose(); });
  return { httpServer, wss, game };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { httpServer } = createServer();
  const port = process.env.PORT || 3000;
  httpServer.listen(port, () => console.log(`Bomberman running at http://localhost:${port}`));
}
