import pusher from "../../pusher/index.js";
import Controller from "../../utility/controller.js";
import UserService from "../services/user.js";

export default Controller.handleWithJSON("PUSHER", {

  post: {

    async "/auth"({ response }, { setFailureCode }){
      const { socketId } = req.body;
      const { id } = response.locals.tokrnData;
      const user = await UserService.getById(id);
      return pusher.authenticateUser(socketId, {
        id,
        user_info: {
          name: user.name,
          username: user.username,
          image: user.image
        },
        watchlist: []
      });
    }

  }

});