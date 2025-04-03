"use client";

import { useEffect } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

// Obtén la URL del WebSocket desde las variables de entorno
const WS_URL = process.env.REACT_APP_WS_URL; // Cambia el prefijo si usas Next.js

// Inicializa el socket solo una vez
export const initializeSocket = () => {
  if (!socket) {
    socket = io(WS_URL); // Usa la URL desde la variable de entorno
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
