import Controller from "../../utility/controller.js";
import TweetService from "../services/tweet.js";

const tweetController = Controller.handleWithJSON("TWEET", {

  get: {

    async "/search"({ request, response }){
      const id = response.locals.tokenData?.id;
      const { q = "", kind = "top", type } = request.query;
      switch(type){
        case "hashtag":
          return TweetService.getByHashtag(q, id, kind);
      }
      return TweetService.get(q, id, kind);
    },

    async "/users"({ request, response}){
      const { id } = response.locals.tokenData;
      return await TweetService.getByFollowings(id);
    }

  },

  post: {

    async "/"({ request, response }){
      const { id } = response.locals.tokenData;
      const { content, refId } = request.body;
      /** @type {{ files: Express.Multer.File[] }} */
      const { files = [] } = request;
      console.log(files);
      const attachments = files.map(file => [ file.path, file.mimetype.split("/")[0] ]);
      const tweet = await TweetService.create(id, content, attachments, refId);
      return tweet;
    },

    async "/:tweetId/like"({ request, response }){
      const { id } = response.locals.tokenData;
      const { tweetId } = request.params;
      const tweet_like = await TweetService.like(tweetId, id);
      return tweet_like;
    },

    async "/:tweetId/retweet"({ request, response }){
      const { id } = response.locals.tokenData;
      const { tweetId } = request.params;
      const tweet_like = await TweetService.retweet(tweetId, id);
      return tweet_like;
    }

  },

  delete: {

    async "/:tweetId/unlike"({ request, response }){
      const { id } = response.locals.tokenData;
      const { tweetId } = request.params;
      return await TweetService.unlike(tweetId, id);
    },

    async "/:tweetId/undo_retweet"({ request, response }){
      const { id } = response.locals.tokenData;
      const { tweetId } = request.params;
      return await TweetService.undoRetweet(tweetId, id);
    }
  }

});

export default tweetController;