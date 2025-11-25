"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { WS_URL, WS_RECONNECT_INTERVAL, WS_MAX_RECONNECT_ATTEMPTS } from "@/lib/constants";

interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

interface UseWebSocketReturn {
  socket: Socket | null;
  connected: boolean;
  error: Error | null;
  send: (event: string, data?: any) => void;
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler?: (...args: any[]) => void) => void;
  connect: () => void;
  disconnect: () => void;
}

/**
 * Custom hook for WebSocket connections using Socket.io
 * Handles connection, reconnection, and event management
 *
 * @param options - Configuration options for the WebSocket connection
 * @returns WebSocket utilities and state
 *
 * @example
 * const { socket, connected, send, on } = useWebSocket({
 *   onConnect: () => console.log('Connected'),
 *   onDisconnect: () => console.log('Disconnected'),
 * });
 *
 * useEffect(() => {
 *   on('message', (data) => {
 *     console.log('Received:', data);
 *   });
 * }, [on]);
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url = WS_URL,
    autoConnect = true,
    reconnect = true,
    maxReconnectAttempts = WS_MAX_RECONNECT_ATTEMPTS,
    reconnectInterval = WS_RECONNECT_INTERVAL,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    try {
      const socket = io(url, {
        transports: ["websocket"],
        reconnection: reconnect,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: reconnectInterval,
      });

      socket.on("connect", () => {
        setConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      });

      socket.on("disconnect", () => {
        setConnected(false);
        onDisconnect?.();

        if (reconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, reconnectInterval);
        }
      });

      socket.on("error", (err: Error) => {
        setError(err);
        onError?.(err);
      });

      socket.on("connect_error", (err: Error) => {
        setError(err);
        onError?.(err);
      });

      socketRef.current = socket;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to connect");
      setError(error);
      onError?.(error);
    }
  }, [url, reconnect, maxReconnectAttempts, reconnectInterval, onConnect, onDisconnect, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
    }
  }, []);

  const send = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn("Socket is not connected. Cannot send message.");
    }
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }
  }, []);

  const off = useCallback((event: string, handler?: (...args: any[]) => void) => {
    if (socketRef.current) {
      if (handler) {
        socketRef.current.off(event, handler);
      } else {
        socketRef.current.off(event);
      }
    }
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    socket: socketRef.current,
    connected,
    error,
    send,
    on,
    off,
    connect,
    disconnect,
  };
}
