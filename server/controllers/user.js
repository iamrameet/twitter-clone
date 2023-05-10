import Controller from "../../utility/controller.js";
import Mailer from "../../utility/mail.js";
import UserService from "../services/user.js";
import JWT from "../../utility/token.js";
import OTPService from "../services/otp.js";
import hash from "../../utility/hash.js";
import Logger from "../../utility/logger.js";
import TweetService from "../services/tweet.js";
import NotificationService from "../services/notification.js";

const userController = Controller.handleWithJSON("USER", {

  get: {

    async "/"({ request, response }){
      const { id } = response.locals.tokenData;
      return await UserService.getById(id, { extended: true });
    },

    async "/username/:username"({ request, response }){
      const { id } = response.locals.tokenData;
      const { username } = request.params;
      const user = await UserService.getByUsername(username, { userId: id });
      delete user.notificationsCount;
      delete user.password;
      return user;
    },

    async "/suggestions/:query"({ request, response }){
      const { query = "" } = request.params;
      return await UserService.getSuggestions(query);
    },

    async "/:userId?/tweets"({ request, response }){
      const { id = null } = response.locals.tokenData;
      const userId = request.params.userId ?? id;
      return await TweetService.getByUserId(userId, { tweets: true });
    },

    async "/:userId?/replies"({ request, response }){
      const { id = null } = response.locals.tokenData;
      const userId = request.params.userId ?? id;
      return await TweetService.getByUserId(userId, { replies: true });
    },

    async "/:userId?/likes"({ request, response }){
      const { id = null } = response.locals.tokenData;
      const userId = request.params.userId ?? id;
      return await TweetService.getByUserId(userId, { liked: true, replies: true, tweets: true });
    },

    async "/check_availability/:field/:value"({ request }){
      const { field, value = "" } = request.params;
      const isAvailable = await UserService.checkAvailabilityOf(field, value);
      return { isAvailable };
    },

    async "/search"({ request, response }){
      const id = response.locals.tokenData?.id;
      const { q = "" } = request.query;
      const users = await UserService.search(q, id);
      return users;
    }

  },

  post: {

    async "/init_account"({ request }){
      const { name, email, dob } = request.body;
      const isAvailable = await UserService.checkAvailabilityOf("email", email);
      if(!isAvailable){
        throw "An account is already associated with provided email.";
      }
      const otp = await OTPService.generate(email);
      await Mailer.sendVerificationMail(email, name, otp.otp);
      return { email, key: otp.key };
    },

    async "/verify_otp"({ request }){
      const { otp, key } = request.body;
      await OTPService.verify(otp, key);
      return { };
    },

    async "/"({ request, response }){
      const { otp, key, name, email, dob, password } = request.body;
      await OTPService.verify(otp, key);
      const userData = await UserService.create(name, email, dob, password);
      await OTPService.destroy(otp).catch(ex => Logger.error("USER_CONTROLLER", ex));
      const token = await JWT.create({ id: userData.id });
      response.cookie("auth-token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "none"
      });
      return { userData, token };
    },

    async "/auth"({ request, response }){
      const { email, password } = request.body;
      const userData = await UserService.getByEmail(email);
      const hashed = await hash(password, userData.id);
      const isAuth = userData.password === hashed;
      if(!isAuth){
        throw "Incorrect password";
      }
      const token = await JWT.create({ id: userData.id });
      await NotificationService.create(userData.id, "login");
      response.cookie("auth-token", token, {
        httpOnly: true,
        sameSite: "none",
        secure: true
      });
      return { userData, token };
    },

    async "/:userId/follow"({ request, response }){
      const { id = null } = response.locals.tokenData;
      const { userId } = request.params;
      return await UserService.follow(userId, id);
    }

  },

  put: {

    async "/:field"({ request }){
      const { userId } = response.locals.tokenData;
      const { field } = request.params;
      const { value = "" } = request.body;
      return UserService.updateField(userId, field, value);
    }

  },

  delete: {

    async "/:userId/unfollow"({ request, response }){
      const { id = null } = response.locals.tokenData;
      const { userId } = request.params;
      return await UserService.unfollow(userId, id);
    }

  }

});

export default userController;