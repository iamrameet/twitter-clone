import { Router } from "express";
import tweetController from "../controllers/tweet.js";
import userAuth, { tryUserAuth } from "../../middlewares/auth.js";
import { attachmentsHandler } from "../../middlewares/multer.js";

const tweetRouter = Router();

tweetRouter.get("/search", tryUserAuth, tweetController.get["/search"]);
tweetRouter.get("/users", tryUserAuth, tweetController.get["/users"]);

tweetRouter.post("/", userAuth, attachmentsHandler, tweetController.post["/"]);
tweetRouter.post("/:tweetId/like", userAuth, tweetController.post["/:tweetId/like"]);
tweetRouter.post("/:tweetId/retweet", userAuth, tweetController.post["/:tweetId/retweet"]);
// tweetRouter.post("/:tweetId/comment", userAuth, tweetController.post["/:tweetId/comment"]);

tweetRouter.delete("/:tweetId/unlike", userAuth, tweetController.delete["/:tweetId/unlike"]);
tweetRouter.delete("/:tweetId/undo_retweet", userAuth, tweetController.delete["/:tweetId/undo_retweet"]);

export default tweetRouter;