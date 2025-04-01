// socket.tsx
"use client";

import { useEffect } from "react";
import { io, Socket } from "socket.io-client";
//const { WS_URL } = process.env;

let socket: Socket | null = null;

// Inicializa el socket solo una vez
export const initializeSocket = () => {
  if (!socket) {
    // socket = io("ws://161.132.47.226:3000"); // Cambia al puerto adecuado del servidor WebSocket
    socket = io("ws://localhost:3000"); // Cambia al puerto adecuado del servidor WebSocket
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
