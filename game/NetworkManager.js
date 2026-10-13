/** WebSocket transport; application handlers survive reconnects. */
export class NetworkManager {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.playerId = null;
    this.slot = null;
    this.handlers = new Map();
    this.connectPromise = null;
  }

  connect() {
    if (this.connected) return Promise.resolve();
    if (this.connectPromise) return this.connectPromise;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    this.ws = ws;
    this.connectPromise = new Promise((resolve, reject) => {
      ws.onopen = () => {
        if (this.ws !== ws) return;
        this.connected = true;
        this.connectPromise = null;
        resolve();
      };
      ws.onmessage = (event) => {
        if (this.ws !== ws) return;
        try {
          this.handleMessage(JSON.parse(event.data));
        } catch (error) {
          console.error('Invalid server message:', error);
        }
      };
      ws.onclose = () => {
        if (this.ws !== ws) return;
        this.ws = null;
        this.connected = false;
        this.playerId = null;
        this.slot = null;
        this.connectPromise = null;
        reject(new Error('Connection closed'));
        this.emit('disconnected');
      };
      ws.onerror = () => {
        // Closing also settles a connection attempt and triggers the reset path.
        if (this.ws === ws) ws.close();
      };
    });
    return this.connectPromise;
  }

  send(data) {
    if (!this.connected || this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(data));
    return true;
  }

  join(nickname) { return this.send({ type: 'JOIN', nickname }); }
  sendMove(direction) { return this.send({ type: 'PLAYER_MOVE', direction }); }
  sendPlaceBomb() { return this.send({ type: 'PLACE_BOMB' }); }
  sendChat(message) { return this.send({ type: 'CHAT', message }); }

  on(type, handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(handler);
  }

  off(type, handler) { this.handlers.get(type)?.delete(handler); }
  emit(type, data) { this.handlers.get(type)?.forEach(handler => handler(data)); }

  handleMessage(data) {
    if (data.type === 'PLAYER_JOINED' && data.playerId !== undefined) {
      this.playerId = data.playerId;
      this.slot = data.slot;
    }
    this.emit(data.type, data);
  }

  disconnect() {
    const ws = this.ws;
    if (ws) ws.close();
    this.connected = false;
    this.playerId = null;
    this.slot = null;
  }
}
