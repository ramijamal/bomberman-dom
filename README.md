# 💣 Bomberman DOM

A real-time multiplayer Bomberman game built with pure DOM manipulation, WebSockets, and a custom mini-framework. No Canvas. No external game libraries.

---

## Getting Started

Requires Node.js 22 or newer.

```bash
npm ci
npm start
```

Then open `http://localhost:3000` in 2–4 browser tabs and start playing.

---

## How to Play

1. Enter a nickname and click **Join Game**.
2. Wait for at least one other player to join.
3. With 2–3 players, a 20-second wait is followed by a 10-second countdown. With 4 players, the 10-second countdown begins immediately.

### Controls

| Action     | Keys               |
|------------|--------------------|
| Move       | Arrow Keys or WASD |
| Place Bomb | Space              |

---

## Game Rules

- 2 to 4 players, each starting from a corner of the map.
- Every player has **3 lives**. Lose them all and you're out.
- Place bombs to destroy blocks and eliminate opponents.
- Last one standing wins.

### Power-Ups

Destroying a block may reveal a power-up:

| Power-Up | Effect                   |
|----------|--------------------------|
| 💣 Bomb  | Place more bombs at once |
| 🔥 Flame | Bigger explosion range   |
| ⚡ Speed | Move faster              |

---

## Features

- Real-time multiplayer via WebSockets
- In-game chat
- Randomly generated destructible blocks each match
- `requestAnimationFrame` rendering with interpolated authoritative movement and an FPS/frame-time display

- Stable player identities across rounds, safe corner escape routes, and simultaneous-elimination draws
- Responsive full-map display and bounded chat history


## Implementation

- `server/GameServer.js` is the authoritative multiplayer simulation. It imports the same `game/constants.js` as the client.
- `server.js` handles HTTP/WebSocket transport, message validation, payload/rate limits, and connection heartbeat.
- `server/staticFiles.js` only exposes browser entry files, game/framework modules, and assets; private server files are not public.
- `app.js` uses the local mini-framework for screens and cached DOM updates for the gameplay hot path. No Canvas, WebGL, or external frontend framework is used.


After a network disconnect, the client reconnects to the server and asks the user to join again. It does not resume an eliminated or disconnected player in an active match. One match/lobby is hosted per server process.
