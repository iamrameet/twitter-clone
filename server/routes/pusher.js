import { Router } from "express";
import userAuth from "../../middlewares/auth.js";
import pusherController from "../controllers/pusher.js";
import pusher from "../../pusher/index.js";
import bodyParser from "body-parser";

const pusherRouter = Router().use(bodyParser.urlencoded({ extended: true }));

pusherRouter.post("/auth", userAuth, pusherController.post["/auth"]);

export default pusherRouter;