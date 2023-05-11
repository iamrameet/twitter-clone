import { PGPool } from "../../database/postgress.js";
import HashtagService from "./hashtag.js";
import NotificationService from "./notification.js";
import { User } from "./user.js";

class Tweet {

  /**
   * @param {number} id
   * @param {number} userId
   * @param {string} content
   * @param {number} createdAt
   * @param {number} [ref_id]
  */
  constructor(id, userId, content, createdAt, ref_id = null){
    this.id = id;
    this.userId = userId;
    this.content = content;
    this.createdAt = createdAt;
    this.refId = ref_id
  }

  /** @param {Partial<Tweet>} object */
  static from(object){
    return new Tweet(object.id, object.user_id, object.content, object.created_at, object.ref_id);
  }

};

class TweetService {

  /** @type {PGPool<Tweet>} */
  static #pool = new PGPool;

  /**
   * @param {number} userId
   * @param {string} content
   * @param {[ url: string, type: string ][]} attachments
   * @param {number} refId
  */
  static async create(userId, content, attachments = [], refId){

    const query = `INSERT INTO tweets(user_id, content, ref_id) VALUES($1, $2, $3) RETURNING *;`;
    const attachmentQuery = `INSERT INTO attachments(tweet_id, url, type) VALUES ${
      attachments.map( (_, index) => {
        const i = (index + 1) * 2;
        return `($1, $${ i }, $${ i + 1 })`;
      }).join(", ")
    } RETURNING *;`;

    const hashtags = content.match(/#\w+/g)?.map?.(hashtag => hashtag.substring(1)) ?? [];
    const mentions = content.match(/@\w+/g)?.map?.(username => username.substring(1)) ?? [];
    const client = await this.#pool.connect();
    let finalResult = await client.tryQueries(

      "Something went wrong while tweeting",

      // 0
      async () => [ query, [ userId, content, refId ], { inResult: true } ],
      console.log(attachments),
      attachments.length > 0 ?
        async result => [
          attachmentQuery,
          [ result.rows[0].id, ...attachments.flat() ],
          { passPrevResult: true }
        ]
      : undefined,
      // 2
      refId ?
        () => NotificationService.createQueryTweet(refId, "reply", {
          userId,
          tweetId: refId
        }, { passPrevResult: true })
      : undefined,

      // 3
      hashtags.length > 0 ? result => {
        return HashtagService.createQuery(result.rows[0].id, hashtags);
      } : undefined,

      ...(mentions.length > 0 ? [

        // 4
        async result => {
          const query = `INSERT INTO mentions(tweet_id, user_id) SELECT $1, users.id FROM users WHERE username IN (${
            mentions.map((username, index) => "$" + (index + 2)).join(", ")
          }) ON CONFLICT DO NOTHING RETURNING *;`
          return [ query, [ result.rows[0].id, ...mentions ], { passPrevResult: true } ];
        },
        result => NotificationService.createMentionsQuery(mentions, { userId, tweetId: result.rows[0].id }),

      ] : [])

    );
    return Tweet.from(finalResult[0]);
  }

  /**
   * @param {User["id"]} userId
   * @param {{ tweets?: boolean, replies?: boolean, liked?: boolean }} options
   */
  static async getByUserId(userId, options){

    const query = `SELECT * FROM (SELECT
        retweets_and_tweets.id,
        retweets_and_tweets.user_id,
        retweets_and_tweets.content,
        retweets_and_tweets.created_at,
        retweets_and_tweets.retweet_of_id,
        (retweets_and_tweets.retweet_of_id IS DISTINCT FROM NULL) AS is_retweeted,
        users.name,
        users.username,
        users.image,
        RefTweets.id as ref_id,
        RefTweets.content as ref_content,
        RefTweets.created_at as ref_created_at,
        RefTweetUsers.id as ref_user_id,
        RefTweetUsers.name AS ref_user_name,
        RefTweetUsers.username AS ref_user_username,
        RefTweetUsers.image AS ref_user_image,
        (SELECT COUNT(*) FROM likes WHERE user_id = $1 AND retweets_and_tweets.id = tweet_id) > 0 AS is_liked,
        CAST(COUNT(DISTINCT likes.tweet_id) AS INTEGER) AS likes,
        CAST(COUNT(DISTINCT T.*) AS INTEGER) AS replies,
        CAST(COUNT(DISTINCT retweets.*) AS INTEGER) AS retweets,
        COALESCE(
          (SELECT json_agg(attachments.*)
          FROM attachments
          WHERE attachments.tweet_id = retweets_and_tweets.id),
          '[]'
        ) AS attachments
      FROM retweets_and_tweets
      LEFT JOIN users ON users.id = retweets_and_tweets.user_id
      LEFT JOIN likes ON retweets_and_tweets.id = likes.tweet_id
      LEFT JOIN tweets AS RefTweets ON retweets_and_tweets.ref_id = RefTweets.id
      LEFT JOIN users AS RefTweetUsers ON RefTweetUsers.id = RefTweets.user_id
      LEFT JOIN tweets AS T ON T.ref_id = retweets_and_tweets.id
      LEFT JOIN retweets ON retweets.tweet_id = retweets_and_tweets.id
      WHERE
        retweets_and_tweets.user_id = $1
        AND (${ options.tweets ? "(retweets_and_tweets.ref_id IS NULL)" : "false" }
        OR ${ options.replies ? "(retweets_and_tweets.ref_id IS DISTINCT FROM NULL)" : "false" })
      GROUP BY
        retweets_and_tweets.id,
        retweets_and_tweets.user_id,
        retweets_and_tweets.content,
        retweets_and_tweets.created_at,
        retweets_and_tweets.retweet_of_id,
        users.id,
        RefTweets.id,
        RefTweetUsers.id,
        refTweets.content,
        refTweets.created_at,
        likes.tweet_id
      ORDER BY retweets_and_tweets.created_at DESC
    ) AS T WHERE ${ options.liked ? "is_liked" : "true" };`;
    // console.log(query);
    const result = await this.#pool.tryQuery("Unable to get tweets", query, [ userId ]);
    // console.log({ options });
    // console.table(result.rows.map(row => ({
    //   tweet_id: row.id,
    //   isLiked: row.is_liked,
    //   isRetweeted: row.is_retweeted,
    //   likes: row.likes
    // })));
    return result.rows;
  }

  /**
   * @param {Tweet["id"]} id
   * @param {User["id"]} userId
   * @returns {Promise<{ id: number, user_id: number, tweet_id: number, created_at: number }>}
   */
  static async like(id, userId){
    const query = "INSERT INTO likes(tweet_id, user_id) VALUES($1, $2) RETURNING *;";
    const client = await this.#pool.connect();
    const [ result ] = await client.tryQueries(
      "Unable to like tweet",
      async () => [ query, [ id, userId ], { inResult: true } ],
      () => NotificationService.createQueryTweet(id, "like", { userId, tweetId: id })
    );
    return result;
  }

  /**
   * @param {Tweet["id"]} id
   * @param {User["id"]} userId
   */
  static async unlike(id, userId){
    const query = "DELETE FROM likes WHERE user_id=$1 AND tweet_id=$2;";
    const result = await this.#pool.tryQuery("Unable to unlike tweet", query, [ userId, id ]);
    return result.rowCount === 1;
  }

  /**
   * @param {Tweet["id"]} id
   * @param {User["id"]} userId
   * @returns {Promise<{ id: number, user_id: number, tweet_id: number, created_at: number }>}
   */
  static async retweet(id, userId){
    const query = "INSERT INTO retweets(tweet_id, user_id) VALUES($1, $2) RETURNING *;";
    const client = await this.#pool.connect();
    const [ result ] = await client.tryQueries(
      "Unable to retweet",
      async () => [ query, [ id, userId ], { inResult: true } ],
      () => NotificationService.createQueryTweet(id, "retweet", { userId, tweetId: id })
    );
    return result;
  }

  /**
   * @param {Tweet["id"]} id
   * @param {User["id"]} userId
   */
  static async undoRetweet(id, userId){
    const query = "DELETE FROM retweets WHERE user_id=$1 AND tweet_id=$2;";
    const result = await this.#pool.tryQuery("Unable to undo retweet", query, [ userId, id ]);
    return result.rowCount === 1;
  }

  static async get(searchQuery, userId = null, kind = "latest"){

    const query = `SELECT
        retweets_and_tweets.id,
        retweets_and_tweets.user_id,
        retweets_and_tweets.content,
        retweets_and_tweets.created_at,
        retweets_and_tweets.retweet_of_id,
        users.name,
        users.username,
        users.image,
        RefTweets.id as ref_id,
        RefTweets.content as ref_content,
        RefTweets.created_at as ref_created_at,
        RefTweetUsers.id as ref_user_id,
        RefTweetUsers.name AS ref_user_name,
        RefTweetUsers.username AS ref_user_username,
        RefTweetUsers.image AS ref_user_image,
        COALESCE(
          (SELECT json_agg(attachments.*)
          FROM attachments
          WHERE attachments.tweet_id = retweets_and_tweets.id),
          '[]'
        ) AS attachments,
        ${
          userId ?
            `(CASE WHEN likes.user_id = $2 THEN TRUE ELSE FALSE END) AS is_liked,
            (retweets_and_tweets.retweet_user_id = $2) AS is_retweeted,`
          : `FALSE AS is_liked, FALSE AS is_retweeted,`
        }
        CAST(COUNT(DISTINCT likes.tweet_id) AS INTEGER) AS likes,
        CAST(COUNT(DISTINCT T.*) AS INTEGER) AS replies,
        CAST(COUNT(DISTINCT retweets.*) AS INTEGER) AS retweets
      FROM retweets_and_tweets
      LEFT JOIN users ON users.id = retweets_and_tweets.user_id
      LEFT JOIN likes ON retweets_and_tweets.id = likes.tweet_id
      LEFT JOIN tweets AS RefTweets ON retweets_and_tweets.ref_id = RefTweets.id
      LEFT JOIN users AS RefTweetUsers ON RefTweetUsers.id = RefTweets.user_id
      LEFT JOIN tweets AS T ON T.ref_id = retweets_and_tweets.id
      LEFT JOIN retweets ON retweets.tweet_id = retweets_and_tweets.id
      WHERE
        retweets_and_tweets.content LIKE $1 OR users.name LIKE $1 OR users.username LIKE $1
      GROUP BY
        retweets_and_tweets.id,
        retweets_and_tweets.user_id,
        retweets_and_tweets.content,
        retweets_and_tweets.created_at,
        retweets_and_tweets.retweet_of_id,
        retweets_and_tweets.retweet_user_id,
        users.id,
        RefTweets.id,
        RefTweetUsers.id,
        refTweets.content,
        refTweets.created_at,
        likes.user_id
      ORDER BY ${ kind === "top" ? "COUNT(likes.tweet_id)" : "retweets_and_tweets.created_at" } DESC
    ;`;
    const values = [ `%${ searchQuery }%` ];
    if(userId){
      values.push(userId);
    }
    const result = await this.#pool.tryQuery("Unable to get tweets", query, values);
    return result.rows;
  }

  static async getByFollowings(userId = null, kind = "latest"){

    const query = `SELECT
        retweets_and_tweets.id,
        retweets_and_tweets.user_id,
        retweets_and_tweets.content,
        retweets_and_tweets.created_at,
        retweets_and_tweets.retweet_of_id,
        users.name,
        users.username,
        users.image,
        RefTweets.id as ref_id,
        RefTweets.content as ref_content,
        RefTweets.created_at as ref_created_at,
        RefTweetUsers.id as ref_user_id,
        RefTweetUsers.name AS ref_user_name,
        RefTweetUsers.username AS ref_user_username,
        RefTweetUsers.image AS ref_user_image,
        COALESCE(
          (SELECT json_agg(attachments.*)
          FROM attachments
          WHERE attachments.tweet_id = retweets_and_tweets.id),
          '[]'
        ) AS attachments,
        (CASE WHEN likes.user_id = $1 THEN TRUE ELSE FALSE END) AS is_liked,
          (retweets_and_tweets.retweet_user_id = $1) AS is_retweeted,
        CAST(COUNT(DISTINCT likes.tweet_id) AS INTEGER) AS likes,
        CAST(COUNT(DISTINCT T.*) AS INTEGER) AS replies,
        CAST(COUNT(DISTINCT retweets.*) AS INTEGER) AS retweets
      FROM retweets_and_tweets
      LEFT JOIN users ON users.id = retweets_and_tweets.user_id
      LEFT JOIN likes ON retweets_and_tweets.id = likes.tweet_id
      LEFT JOIN tweets AS RefTweets ON retweets_and_tweets.ref_id = RefTweets.id
      LEFT JOIN users AS RefTweetUsers ON RefTweetUsers.id = RefTweets.user_id
      LEFT JOIN tweets AS T ON T.ref_id = retweets_and_tweets.id
      LEFT JOIN retweets ON retweets.tweet_id = retweets_and_tweets.id
      WHERE
        retweets_and_tweets.user_id IN (SELECT user_id FROM followers WHERE follower_id = $1)
      GROUP BY
        retweets_and_tweets.id,
        retweets_and_tweets.user_id,
        retweets_and_tweets.content,
        retweets_and_tweets.created_at,
        retweets_and_tweets.retweet_of_id,
        retweets_and_tweets.retweet_user_id,
        users.id,
        RefTweets.id,
        RefTweetUsers.id,
        refTweets.content,
        refTweets.created_at,
        likes.user_id
      ORDER BY ${ kind === "top" ? "COUNT(likes.tweet_id)" : "retweets_and_tweets.created_at" } DESC
    ;`;
    const result = await this.#pool.tryQuery("Unable to get tweets", query, [ userId ]);
    return result.rows;
  }

  static async getByHashtag(hashtag, userId = null, kind = "latest"){
    console.log({hashtag})

    const query = `SELECT
        retweets_and_tweets.id,
        retweets_and_tweets.user_id,
        retweets_and_tweets.content,
        retweets_and_tweets.created_at,
        retweets_and_tweets.retweet_of_id,
        users.name,
        users.username,
        users.image,
        RefTweets.id as ref_id,
        RefTweets.content as ref_content,
        RefTweets.created_at as ref_created_at,
        RefTweetUsers.id as ref_user_id,
        RefTweetUsers.name AS ref_user_name,
        RefTweetUsers.username AS ref_user_username,
        RefTweetUsers.image AS ref_user_image,
        COALESCE(
          (SELECT json_agg(attachments.*)
          FROM attachments
          WHERE attachments.tweet_id = retweets_and_tweets.id),
          '[]'
        ) AS attachments,
        ${
          userId ?
            `(CASE WHEN likes.user_id = $2 THEN TRUE ELSE FALSE END) AS is_liked,
            (retweets_and_tweets.retweet_user_id = $2) AS is_retweeted,`
          : `FALSE AS is_liked, FALSE AS is_retweeted,`
        }
        CAST(COUNT(DISTINCT likes.tweet_id) AS INTEGER) AS likes,
        CAST(COUNT(DISTINCT T.*) AS INTEGER) AS replies,
        CAST(COUNT(DISTINCT retweets.*) AS INTEGER) AS retweets
      FROM (
        SELECT retweets_and_tweets.*
        FROM hashtags
        LEFT JOIN retweets_and_tweets ON retweets_and_tweets.id = hashtags.tweet_id
        WHERE hashtags.hashtag = $1
      ) AS retweets_and_tweets
      LEFT JOIN users ON users.id = retweets_and_tweets.user_id
      LEFT JOIN likes ON retweets_and_tweets.id = likes.tweet_id
      LEFT JOIN tweets AS RefTweets ON retweets_and_tweets.ref_id = RefTweets.id
      LEFT JOIN users AS RefTweetUsers ON RefTweetUsers.id = RefTweets.user_id
      LEFT JOIN tweets AS T ON T.ref_id = retweets_and_tweets.id
      LEFT JOIN retweets ON retweets.tweet_id = retweets_and_tweets.id
      GROUP BY
        retweets_and_tweets.id,
        retweets_and_tweets.user_id,
        retweets_and_tweets.content,
        retweets_and_tweets.created_at,
        retweets_and_tweets.retweet_of_id,
        retweets_and_tweets.retweet_user_id,
        users.id,
        RefTweets.id,
        RefTweetUsers.id,
        refTweets.content,
        refTweets.created_at,
        likes.user_id
      ORDER BY ${ kind === "top" ? "COUNT(likes.tweet_id)" : "retweets_and_tweets.created_at" } DESC
    ;`;
    const values = [ hashtag ];
    if(userId){
      values.push(userId);
    }
    const result = await this.#pool.tryQuery("Unable to get tweets", query, values);
    console.log(result.rows);
    return result.rows;
  }

};

export default TweetService;