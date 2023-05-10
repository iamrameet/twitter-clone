import { Router } from "express";
import userAuth from "../../middlewares/auth.js";
import notificationController from "../controllers/notification.js";

const notificationRouter = Router();

notificationRouter.get("/", userAuth, notificationController.get["/"]);

export default notificationRouter;