import { Router } from "express";
import userAuth from "../../middlewares/auth.js";
import hashtagController from "../controllers/hashtag.js";

const hashtagRouter = Router();

hashtagRouter.get("/trending", hashtagController.get["/trending"]);

export default hashtagRouter;