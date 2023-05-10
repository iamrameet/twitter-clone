import { PGPool } from "../../database/postgress.js";

class Hashtag {
  /**
   * @param {string} hashtag
   * @param {number} tweetId
   * @param {number} createdAt
  */
  constructor(hashtag, tweetId, createdAt){
    this.hashtag = hashtag;
    this.tweetId = tweetId;
    this.createdAt = createdAt;
  }
  /** @param {{ hashtag: string, tweet_id: number, created_at: number }} hashtag */
  static from(hashtag){
    return new Hashtag(hashtag.hashtag, hashtag.tweet_id, hashtag.created_at);
  }
};

class HashtagService {

  /** @type {PGPool<Hashtag>} */
  static #pool = new PGPool;

  /**
   * @param {number} tweetId
   * @param {string[]} hashtags
   * @returns {import("../../database/postgress.js").QueriesDataReturns} */
  static createQuery(tweetId, hashtags){
    const query = `INSERT INTO hashtags(hashtag, tweet_id) VALUES ${
      hashtags.map((hashtag, index) => `($${ index + 2 }, $1)`).join(", ")
    } ON CONFLICT DO NOTHING RETURNING *;`;
    return /** @type {const} */ ([ query, [ tweetId, ...hashtags ], {
      exception: "Unable to create hashtags",
      passPrevResult: true
    } ]);
  }

  static async getByHashtag(hashtag){
    const query = `SELECT * FROM hashtags WHERE hashtags=$1;`;
    const result = await this.#pool.tryQuery("Unable to get hashtags", query, [ hashtag ]);
    if(result.rowCount !== 1){
      throw "Invalid OTP"
    }
    return result.rows[0];
  }

  static async getTrending(){
    const query = `SELECT
        hashtag, COUNT(*)
      FROM hashtags
      WHERE created_at > NOW() - INTERVAL '1d'
      GROUP BY hashtag
      ORDER BY COUNT(*) DESC;`;
    const result = await this.#pool.tryQuery("Unable to get trending hashtags", query);
    return result.rows;
  }

};

export default HashtagService;