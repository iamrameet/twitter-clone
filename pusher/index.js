import Pusher from "pusher";
import { PusherOptions } from "../config.js";

const pusher = new Pusher({
  ...PusherOptions,
  useTLS: true
});

export default pusher;