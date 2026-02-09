import { io, Socket } from 'socket.io-client';
import { API_URL } from './constants';
import { getTokens } from './auth-store';

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket | null> {
  if (socket?.connected) return socket;

  const { accessToken } = await getTokens();
  if (!accessToken) return null;

  socket = io(API_URL, {
    auth: { token: accessToken },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 3000,
  });

  socket.on('connect', () => {
    // connected
  });

  socket.on('connect_error', () => {
    // connection failed — will retry
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}
