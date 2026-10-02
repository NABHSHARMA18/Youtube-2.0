import {
  io,
  Socket,
} from "socket.io-client";

let socket: Socket | null = null;

export const getVideoCallSocket =
  () => {
    if (!socket) {
      const url =
        process.env
          .NEXT_PUBLIC_BACKEND_URL ||
        "http://localhost:5000";

      socket = io(url, {
        transports: [
          "websocket",
          "polling",
        ],

        autoConnect: false,
      });
    }

    return socket;
  };

export const disconnectVideoCallSocket =
  () => {
    if (socket) {
      socket.disconnect();

      socket = null;
    }
  };