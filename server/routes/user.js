import { Router } from "express";
import userController from "../controllers/user.js";
import userAuth, { tryUserAuth } from "../../middlewares/auth.js";
import { imageHandler } from "../../middlewares/multer.js";

const userRouter = Router();

// userRouter.get("/:id", userController["/:id"]);

userRouter.get("/suggestions/:query", userController.get["/suggestions/:query"]);

userRouter.get("/username/:username", userAuth, userController.get["/username/:username"]);
userRouter.get("/:userId?/tweets", userAuth, userController.get["/:userId?/tweets"]);
userRouter.get("/:userId?/replies", userAuth, userController.get["/:userId?/replies"]);
userRouter.get("/:userId?/likes", userAuth, userController.get["/:userId?/likes"]);

userRouter.get("/", userAuth, userController.get["/"]);
userRouter.get("/search", tryUserAuth, userController.get["/search"]);
userRouter.get("/check_availability/:field/:value", userController.get["/check_availability/:field/:value"]);

userRouter.post("/init_account", userController.post["/init_account"]);
userRouter.post("/verify_otp", userController.post["/verify_otp"]);
userRouter.post("/", userController.post["/"]);
userRouter.post("/auth", userController.post["/auth"]);
userRouter.post("/:userId/follow", userAuth, userController.post["/:userId/follow"]);

userRouter.put("/update", imageHandler.fields([
  { name: "image", maxCount: 1 },
  { name: "cover", maxCount: 1 }
]), userAuth, userController.put["/update"]);
userRouter.put("/:field", userAuth, userController.put["/:field"]);

userRouter.delete("/:userId/unfollow", userAuth, userController.delete["/:userId/unfollow"]);

export default userRouter;