import { PGPool } from "../../database/postgress.js";
import hash from "../../utility/hash.js";
import NotificationService from "./notification.js";

class User{

  /**
   * @param {number} id
   * @param {string} username
   * @param {string} name
   * @param {string} email
   * @param {number} dob
   * @param {string} password
   * @param {number} createdAt
   * @param {string} image
  */
  constructor(id, username, name, email, dob, password, createdAt, image){
    this.id = id;
    this.username = username;
    this.name = name;
    this.email = email;
    this.dob = dob;
    this.password = password;
    this.createdAt = createdAt;
    this.image = image;
    this.tweetCount = 0;
    this.followerCount = 0;
    this.followingCount = 0;
    this.isFollowedBy = false;
    this.isFollower = false;
    this.notificationsCount = 0;
  }

  /** @param {Partial<User>} object */
  static from(object){
    const instance = new this(
      object.id,
      object.username,
      object.name,
      object.email,
      object.dob,
      object.password,
      object.created_at,
      object.image
    );
    console.log(object);
    instance.followerCount = object.follower_count;
    instance.followingCount = object.following_count;
    instance.tweetCount = object.tweet_count;
    instance.isFollowedBy = object.is_followed_by;
    instance.isFollower = object.is_follower;
    instance.notificationsCount = object.notifications_count;
    return instance;
  }

};

class UserService{

  /** @type {PGPool<User>} */
  static #pool = new PGPool;

  static async #getByColumn(column_name, value, options = { extended: false, userId: null }){
    const query = `SELECT
      users.id,
      users.name,
      users.username,
      users.created_at,
      users.password,
      CAST(COUNT(DISTINCT tweets.*) AS INTEGER) AS tweet_count,
      CAST(COUNT(DISTINCT followers.*) AS INTEGER) AS follower_count,
      CAST(COUNT(DISTINCT following.*) AS INTEGER) AS following_count,
      CAST(
        (SELECT COUNT(notifications.*) FROM notifications WHERE notifications.user_id = users.id
      ) AS INTEGER) AS notification_count
      ${
        options?.userId ?
          `, (SELECT count(*) = 1
            FROM followers
            WHERE user_id = users.id AND follower_id = $2
          ) AS is_followed_by,
          (SELECT count(*) = 1
            FROM followers
            WHERE user_id = $2 AND follower_id = users.id
          ) AS is_follower`
        : ""
      }
    FROM users
    LEFT JOIN tweets ON tweets.user_id = users.id
    LEFT JOIN followers ON followers.user_id = users.id
    LEFT JOIN followers AS following ON following.follower_id = users.id
    WHERE users.${column_name} = $1
    GROUP BY users.id;`;
    console.log(query, [
      value,
      ...[ options?.userId ].filter(id => id)
    ]);
    const result = await this.#pool.tryQuery(
      "Unable to get user",
      query,
      [
        value,
        ...[ options?.userId ].filter(id => id)
      ]
    );
    if(result.rowCount === 0){
      throw "User not found";
    }
    return User.from(result.rows[0]);
  }

  /** @param {{ extended?: boolean }} options */
  static async getById(id, options){
    return this.#getByColumn("id", id, options);
  }

  /** @param {{ extended?: boolean }} options */
  static async getByUsername(username, options){
    return this.#getByColumn("username", username, options);
  }

  /** @param {{ extended?: boolean }} options */
  static async getByEmail(email, options){
    return this.#getByColumn("email", email, options);
  }

  /** @param {string} q */
  static async getSuggestions(q){
    const query = "SELECT name, username, id, image FROM users WHERE username LIKE $1;";
    const result = await this.#pool.tryQuery("Unable to get users", query, [ `%${q}%` ]);
    return result.rows;
  }

  /**
   * @param {string} q
   * @param {number} [userId]
  */
  static async search(q, userId){
    const query = `SELECT DISTINCT ON (users.id)
        users.name, users.username, users.id, users.image,
        tweets.content AS recent_tweet_content,
        ${
          userId ? `(SELECT id FROM followers WHERE user_id = users.id AND follower_id = $2) IS DISTINCT FROM NULL as is_following` : "FALSE AS is_following"
        }
      FROM users
      LEFT JOIN tweets ON tweets.user_id = users.id
      WHERE username LIKE $1 OR name LIKE $1
      ORDER BY users.id, tweets.created_at DESC`;
    const values = [ `%${q}%` ];
    if(userId){
      values.push(userId);
    }
    const result = await this.#pool.tryQuery("Unable to get users", query, values);
    return result.rows.map(row => {
      row.createdAt = row.created_at;
      row.isFollowing = row.is_following;
      if(row.recent_tweet_content){
        row.recentTweet = { content: row.recent_tweet_content };
      }
      delete row.created_at;
      delete row.is_following;
      delete row.recent_tweet_content;
      return row;
    });
  }

  /**
   * @param {string} name
  */
  static async create(name, email, dob, password){
    const username = name.replace(/\s/g, "").toLowerCase() + "."
      + globalThis.SERVER.dateTime.msecsTillNow();
    const insertQuery = `INSERT INTO users(name, username, email, dob, password) VALUES($1, $2, $3, $4, $5) RETURNING *;`;
    const client = await this.#pool.connect();
    const insertResult = await client.tryQueries(
      "Unable to create user",
      () => [ insertQuery, [ name, username, email, dob, password ] ],
      async result => {
        const { id } = result.rows[0];
        const hashedPassword = await hash(password, id);
        const updateQuery = `UPDATE users SET password=$2 WHERE id=$1 RETURNING id, name, username, email;`;
        return [ updateQuery, [ id, hashedPassword ] ];
      }
    );
    const [ row ] = insertResult.rows;
    return row;
  }

  /**
   * @template {keyof User} T
   * @param {User["id"]} id
   * @param {T} column_name
   * @param {User[T]} value
  */
  static async #updateColumn(id, column_name, value){
    const query = `UPDATE users SET ${column_name}=$2 WHERE id=$1;`;
    const result = await this.#pool.tryQuery(
      `Unable to update user's '${column_name}'`,
      query, [ id, value ]
    );
    if(result.rowCount === 0){
      throw "User not found";
    }
    return { field: column_name, value };
  }

  /**
   * @template {Extract<keyof User, "username" | "email" | "password" | "image">} T
   * @param {User["id"]} id
   * @param {T} field
   * @param {User[T]} value
  */
  static async updateField(id, field, value){
    switch(field){
      case "username":
      case "email":
      case "image":
        return UserService.#updateColumn(id, field, value);
      case "password":
        return UserService.#updateColumn(id, field, await hash(value, id));
      default:
        throw `invalid field '${field}'`;
    }
  }

  /**
   * @template {keyof User} T
   * @param {T} column_name
   * @param {User[T]} value
  */
  static async #doesExist(column_name, value){
    const query = `SELECT id FROM users WHERE ${column_name} = $1;`;
    const result = await this.#pool.tryQuery(
      `Unable to check for user's '${column_name}'`,
      query, [ value ]
    );
    return result.rowCount === 1;
  }

  /**
   * @template {Extract<keyof User, "username" | "email">} T
   * @param {T} field
   * @param {User[T]} value
  */
  static async checkAvailabilityOf(field, value){
    switch(field){
      case "username":
      case "email":
        return !await this.#doesExist(field, value);
      default:
        throw `invalid field '${field}'`;
    }
  }

  /**
   * @param {User["id"]} userId
   * @param {User["id"]} followerId
   * @returns {Promise<{ id: number, user_id: number, follower_id: number, created_at: number }>}
   */
  static async follow(userId, followerId){
    const query = "INSERT INTO followers(user_id, follower_id) VALUES($1, $2) RETURNING *;";
    const client = await this.#pool.connect();
    const [ result ] = await client.tryQueries(
      "Unable to follow user",
      async () => [ query, [ userId, followerId ], { inResult: true } ],
      () => NotificationService.createQuery(userId, "follow", { followerId })
    );
    return result;
  }

  /**
   * @param {User["id"]} userId
   * @param {User["id"]} followerId
   */
  static async unfollow(userId, followerId){
    const query = "DELETE FROM followers WHERE user_id=$1 AND follower_id=$2;";
    const result = await this.#pool.tryQuery("Unable to unfollow user", query, [ userId, followerId ]);
    return result.rowCount === 1;
  }

};

export { User };

export default UserService;