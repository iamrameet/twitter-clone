import { Server, Client } from "./config.js";
import os from "node:os";
import express from "express";
import userRouter from "./server/routes/user.js";
import DateTime from "./utility/datetime.js";
import cors from "cors";
import hash from "./utility/hash.js";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import tweetRouter from "./server/routes/tweet.js";
import hashtagRouter from "./server/routes/hashtag.js";
import notificationRouter from "./server/routes/notification.js";
import Logger from "./utility/logger.js";
import pusher from "./pusher/index.js";
import pusherRouter from "./server/routes/pusher.js";

Logger.level = Logger.Level.ALL;

globalThis.SERVER = {
  dateTime: new DateTime(1681560095416)
};

const expressServer = express();

expressServer.use(function(request, response, next){
  response.header("Access-Control-Allow-Origin", Client.origin);
  response.header("Access-Control-Allow-Credentials", "true");
  response.header("Access-Control-Allow-Headers", "Content-Type");
  response.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  if(request.method === "OPTIONS"){
    return response.status(200).send("");
  }
  next();
});

expressServer.use(cookieParser());
expressServer.use(bodyParser.json());

expressServer.use("/data/files", express.static("data/files"));

// expressServer.get("/gen", async function(request, response){
//   response.send(await hash("rockman123", 37));
// });

expressServer.use("/api/user", userRouter);
expressServer.use("/api/tweet", tweetRouter);
expressServer.use("/api/hashtag", hashtagRouter);
expressServer.use("/api/notification", notificationRouter);
expressServer.use("/pusher", pusherRouter);

expressServer.listen(Server.port, () => {

  pusher.trigger("my-channel", "my-event", {
    message: "hello world"
  });

  const networkInterfaces = os.networkInterfaces();
  const addresses = [];

  for(const iface in networkInterfaces){
    const networkInterface = networkInterfaces[iface];
    for(const info of networkInterface){
      if(info.family === "IPv4" && !info.internal){
        addresses.push(info.address);
      }
    }
  }
  Logger.log("SERVER", `Server started: http://${ addresses }:${ Server.port }`);

});