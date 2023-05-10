/// <reference path="../../helper/schema.server.ts"/>

import { PGPool } from "../../database/postgress.js";

class NotificationService {

  /** @type {PGPool<NotificationSchema>} */
  static #pool = new PGPool();

  /**
   * @template {keyof NotificationTypeContentMap} T
   * @param {NotificationSchema<T>["user_id"]} userId
   * @param {NotificationSchema<T>["type"]} type
   * @param {NotificationTypeContentMap[T]} content
   * @param {import("../../database/postgress.js").QueriesDataReturns[2]} options
   * @returns {import("../../database/postgress.js").QueriesDataReturns}
  */
  static createQuery(userId, type, content = {}, options = {}){
    console.log({userId, type, content});
    return [
      `INSERT INTO notifications(user_id, type, content) values($1, $2, $3) ON CONFLICT DO NOTHING;`,
      [ userId, type, JSON.stringify(content) ],
      options
    ];
  }

  /**
   * @template {keyof NotificationTypeContentMap} T
   * @param {number} tweetId
   * @param {NotificationSchema<T>["type"]} type
   * @param {NotificationTypeContentMap[T]} content
   * @param {import("../../database/postgress.js").QueriesDataReturns[2]} options
   * @returns {import("../../database/postgress.js").QueriesDataReturns}
  */
  static createQueryTweet(tweetId, type, content = {}, options = {}){
    return [
      `INSERT INTO notifications(user_id, type, content) VALUES((SELECT user_id FROM tweets WHERE id = $1), $2, $3) ON CONFLICT DO NOTHING;`,
      [ tweetId, type, JSON.stringify(content) ],
      options
    ];
  }

  /**
   * @param {string[]} usernames
   * @param {NotificationTypeContentMap["mention"]} content
   * @param {import("../../database/postgress.js").QueriesDataReturns[2]} options
   * @returns {import("../../database/postgress.js").QueriesDataReturns}
  */
  static createMentionsQuery(usernames, content = {}, options = {}){
    return [
      `INSERT INTO notifications (type, content, user_id)
        SELECT 'mention', $1, users.id
        FROM users
        WHERE username IN (${ usernames.map((username, index) => "$" + (index + 2)).join(", ") })
      ON CONFLICT DO NOTHING;`,
      [ JSON.stringify(content), ...usernames ],
      options
    ];
  }

  /**
   * @template {keyof NotificationTypeContentMap} T
   * @param {NotificationSchema<T>["user_id"]} userId
   * @param {NotificationSchema<T>["type"]} type
   * @param {NotificationTypeContentMap[T]} content
  */
  static async create(userId, type, content){
    const queryStream = this.createQuery(userId, type, content);
    const result = await this.#pool.tryQuery("Unable to create notification", ...queryStream);
    result.rows[0];
  }

  /** @param {number} userId */
  static async getAll(userId){
    const query = `SELECT
        notifications.id,
        notifications.user_id,
        notifications.created_at,
        notifications.is_read,
        notifications.type,
        (CASE
          WHEN jsonb_exists(notifications.content, 'followerId')
          THEN jsonb_build_object('follower', jsonb_build_object(
            'id', users.id,
            'name', users.name,
            'username', users.username,
            'image', users.image
          ))
          WHEN jsonb_exists(notifications.content, 'userId')
          THEN jsonb_build_object('user', jsonb_build_object(
            'id', users.id,
            'name', users.name,
            'username', users.username,
            'image', users.image
          ))
          ELSE notifications.content
        END) AS content
      FROM notifications
      LEFT JOIN users ON CAST(CASE
        WHEN jsonb_exists(notifications.content, 'followerId')
        THEN notifications.content->>'followerId'
        WHEN jsonb_exists(notifications.content, 'userId')
        THEN notifications.content->>'userId'
        ELSE NULL
      END AS INTEGER) = users.id
      WHERE user_id = $1
      ORDER BY created_at DESC;`;
    const result = await this.#pool.tryQuery("Unable to get notifications", query, [ userId ]);
    console.log(result.rows);
    return result.rows;
  }

};

export default NotificationService;