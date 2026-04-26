/**
 * WebSocket Service for Real-time Updates
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Connection status tracking
 * - Channel-based subscriptions
 * - Event emission
 * - Token-based authentication
 */

import { io, Socket } from 'socket.io-client';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export type Channel =
  | 'admin:dashboard'
  | `admin:vendor:${string}`
  | `admin:venue:${string}`
  | 'admin:kyc:*'
  | 'admin:payment:*'
  | 'admin:payout:*'
  | 'admin:event:*'
  | 'admin:review:*'
  | 'admin:system:*'
  | 'notifications';

export type EventCallback = (data: any) => void;

interface WebSocketServiceConfig {
  url?: string;
  autoConnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
}

class WebSocketServiceClass {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private eventListeners: Map<string, Set<EventCallback>> = new Map();
  private config: WebSocketServiceConfig;
  private connectPromise: Promise<void> | null = null;

  constructor(config: WebSocketServiceConfig = {}) {
    this.config = {
      url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      autoConnect: true,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
      reconnectDelay: config.reconnectDelay ?? 1000,
      maxReconnectDelay: config.maxReconnectDelay ?? 30000,
    };

    this.maxReconnectAttempts = this.config.maxReconnectAttempts!;
    this.reconnectDelay = this.config.reconnectDelay!;
    this.maxReconnectDelay = this.config.maxReconnectDelay!;

    if (this.config.autoConnect) {
      this.connect();
    }
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.socket?.connected) {
      console.log('[WebSocket] Already connected');
      return Promise.resolve();
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.updateStatus('connecting');

    const WS_URL = this.config.url!.replace('http', 'ws').replace('https', 'wss');
    const token = this.getAuthToken();

    this.socket = io(`${WS_URL}/realtime`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: false, // We handle reconnection manually
      timeout: 10000,
      forceNew: true,
    });

    this.connectPromise = new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error('Socket not initialized'));

      const connectTimeout = setTimeout(() => {
        this.connectPromise = null;
        reject(new Error('Connection timeout'));
      }, 10000);

      this.socket.once('connect', () => {
        clearTimeout(connectTimeout);
        this.connectPromise = null;
        this.reconnectAttempts = 0;
        this.updateStatus('connected');
        console.log('[WebSocket] Connected to server');
        this.resubscribeAll();
        resolve();
      });

      this.socket.once('connect_error', (error) => {
        clearTimeout(connectTimeout);
        this.connectPromise = null;
        this.updateStatus('disconnected');
        console.error('[WebSocket] Connection error:', error.message);
        this.handleReconnection().catch(console.error);
        reject(error);
      });
    });

    this.setupEventListeners();

    return this.connectPromise;
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.updateStatus('disconnected');
      console.log('[WebSocket] Disconnected');
    }
  }

  /**
   * Subscribe to a channel
   */
  subscribe(channel: string, callback: EventCallback): () => void {
    if (!this.eventListeners.has(channel)) {
      this.eventListeners.set(channel, new Set());
    }
    this.eventListeners.get(channel)!.add(callback);

    // Attach listener to socket if connected
    if (this.socket?.connected) {
      this.socket.on(channel, callback);
    }

    console.log(`[WebSocket] Subscribed to channel: ${channel}`);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(channel, callback);
    };
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: string, callback?: EventCallback): void {
    const listeners = this.eventListeners.get(channel);
    if (!listeners) return;

    if (callback) {
      listeners.delete(callback);
      if (this.socket?.connected) {
        this.socket.off(channel, callback);
      }
    } else {
      listeners.clear();
      if (this.socket?.connected) {
        this.socket.off(channel);
      }
      this.eventListeners.delete(channel);
    }

    console.log(`[WebSocket] Unsubscribed from channel: ${channel}`);
  }

  /**
   * Emit an event to the server
   */
  emit(event: string, data: any): void {
    if (!this.socket?.connected) {
      console.warn('[WebSocket] Cannot emit event - not connected');
      return;
    }

    this.socket.emit(event, data);
    console.log(`[WebSocket] Emitted event: ${event}`, data);
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Subscribe to connection status changes
   */
  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    // Immediately call with current status
    listener(this.connectionStatus);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get authentication token from localStorage
   */
  private getAuthToken(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    
    const user = localStorage.getItem('NearZro_user');
    if (!user) return undefined;
    
    try {
      const parsed = JSON.parse(user);
      return parsed.token;
    } catch {
      return undefined;
    }
  }

  /**
   * Update connection status and notify listeners
   */
  private updateStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
    this.statusListeners.forEach(listener => listener(status));
  }

  /**
   * Setup socket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      this.updateStatus('disconnected');
      this.handleReconnection().catch(console.error);
    });

    this.socket.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
    });

    // Subscribe to all registered channels on connect
    this.socket.on('connect', () => {
      this.resubscribeAll();
    });
  }

  /**
   * Resubscribe to all channels after reconnection
   */
  private resubscribeAll(): void {
    this.eventListeners.forEach((callbacks, channel) => {
      callbacks.forEach(callback => {
        this.socket?.on(channel, callback);
      });
    });
    console.log('[WebSocket] Resubscribed to all channels');
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private async handleReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      this.updateStatus('disconnected');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    this.updateStatus('reconnecting');

    await new Promise(resolve => setTimeout(resolve, delay));
    await this.connect().catch(console.error);
  }
}

// Export singleton instance
export const WebSocketService = new WebSocketServiceClass();

// Hook helpers for React
export function createWebSocketService(config?: WebSocketServiceConfig) {
  return new WebSocketServiceClass(config);
}
