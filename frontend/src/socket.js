import { io } from "socket.io-client";
import server from "./environment";

const socket = io(server, {
  withCredentials: true,
  autoConnect: true,
});

export default socket;
