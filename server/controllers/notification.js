import Controller from "../../utility/controller.js";
import NotificationService from "../services/notification.js";

export default Controller.handleWithJSON("NOTIFICATION", {

  get: {

    async "/"({ response }){
      const { id } = response.locals.tokenData;
      return await NotificationService.getAll(id);
    }

  }

});