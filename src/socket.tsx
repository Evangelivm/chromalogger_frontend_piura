"use client";

import { useEffect } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

// Inicializa el socket solo una vez
export const initializeSocket = () => {
  if (!socket) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3000";
    socket = io(wsUrl);
  }
  return socket;
};

// Custom Hook para usar el socket
export const useSocket = (event: string, callback: (data: any) => void) => {
  useEffect(() => {
    const socket = initializeSocket();

    // Escuchar el evento específico
    socket.on(event, callback);

    // Limpiar la suscripción al desmontar
    return () => {
      socket.off(event, callback);
    };
  }, [event, callback]);
};
