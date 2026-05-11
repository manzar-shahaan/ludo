import type { Intent, ServerMessage } from './types';

type MessageHandler = (msg: ServerMessage) => void;

const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 10;

class LudoClient {
  private ws: WebSocket | null = null;
  private url = '';
  private handlers: MessageHandler[] = [];
  private openHandlers: (() => void)[] = [];
  private closeHandlers: (() => void)[] = [];
  private reconnectAttempts = 0;
  private shouldReconnect = false;
  private queuedMessages: Intent[] = [];

  connect(url: string): void {
    this.url = url;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this._open();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.ws?.close();
    this.ws = null;
  }

  send(intent: Intent): void {
    const data = JSON.stringify(intent);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      this.queuedMessages.push(intent);
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.push(handler);
    return () => { this.handlers = this.handlers.filter(h => h !== handler); };
  }

  onOpen(handler: () => void): () => void {
    this.openHandlers.push(handler);
    return () => { this.openHandlers = this.openHandlers.filter(h => h !== handler); };
  }

  onClose(handler: () => void): () => void {
    this.closeHandlers.push(handler);
    return () => { this.closeHandlers = this.closeHandlers.filter(h => h !== handler); };
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private _open(): void {
    if (this.ws) return;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      // Flush queued messages
      while (this.queuedMessages.length > 0) {
        const msg = this.queuedMessages.shift()!;
        this.ws!.send(JSON.stringify(msg));
      }
      this.openHandlers.forEach(h => h());
    };

    this.ws.onmessage = (event) => {
      let msg: ServerMessage;
      try { msg = JSON.parse(event.data); } catch { return; }
      this.handlers.forEach(h => h(msg));
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.closeHandlers.forEach(h => h());
      if (this.shouldReconnect && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        this.reconnectAttempts++;
        setTimeout(() => this._open(), RECONNECT_DELAY);
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }
}

export const wsClient = new LudoClient();
