import Controller from "../../utility/controller.js";
import HashtagService from "../services/hashtag.js";

export default Controller.handleWithJSON("HASHTAG", {

  get: {

    async "/trending"(){
      return await HashtagService.getTrending();
    }

  }

});