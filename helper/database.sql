CREATE TABLE otps(
  key SERIAL PRIMARY KEY,
  otp CHAR(6) UNIQUE NOT NULL
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL CHECK (LENGTH(name) >= 2 AND name !~ '[^a-zA-Z0-9 ]'),
  username VARCHAR(255) UNIQUE NOT NULL CHECK (username ~ '^[a-zA-Z0-9_]{1,15}$'),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL CHECK (LENGTH(password) >= 6),
  dob DATE NOT NULL,
  image VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tweets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  attachments JSON
);

CREATE TABLE mentions (
  user_id INTEGER REFERENCES users(id),
  tweet_id INTEGER REFERENCES tweets(id),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT mentions_pk PRIMARY KEY(tweet_id, user_id)
);

CREATE TABLE followers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  follower_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE likes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  tweet_id INTEGER REFERENCES tweets(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE retweets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  tweet_id INTEGER REFERENCES tweets(id),
  created_at TIMESTAMP DEFAULT NOW()
);


-- Insert a new user
INSERT INTO users (username, email, password) VALUES ('johnsmith', 'johnsmith@example.com', 'mypassword');

-- Get all tweets for a user
SELECT * FROM tweets WHERE user_id = 1;

-- Get all followers for a user
SELECT followers.*, users.username AS follower_username FROM followers INNER JOIN users ON followers.follower_id = users.id WHERE followers.user_id = 1;

-- Like a tweet
INSERT INTO likes (user_id, tweet_id) VALUES (1, 1);

-- Retweet a tweet
INSERT INTO retweets (user_id, tweet_id) VALUES (1, 1);

-- Get all tweets liked by a user
SELECT tweets.*, likes.created_at AS liked_at FROM tweets INNER JOIN likes ON tweets.id = likes.tweet_id WHERE likes.user_id = 1;

-- Get all tweets and retweets for a user and their followers
SELECT tweets.*, retweets.user_id AS retweeted_by_user_id FROM tweets LEFT JOIN retweets ON tweets.id = retweets.tweet_id WHERE tweets.user_id = 1 OR tweets.user_id IN (SELECT follower_id FROM followers WHERE user_id = 1);

SELECT
  tweets.id,
  tweets.user_id AS uerId,
  tweets.content,
  tweets.created_at,
  users.name,
  users.username,
  RefTweets.id as ref_id,
  RefTweets.user_id as ref_user_id,
  RefTweets.content as ref_content,
  RefTweets.created_at as ref_created_at,
  CAST(COUNT(likes.tweet_id) AS INTEGER) AS likes,
  COUNT(CASE WHEN likes.user_id = 37 THEN 1 ELSE NULL END) AS is_liked
FROM users
LEFT JOIN tweets ON users.id = tweets.user_id
LEFT JOIN likes ON tweets.id = likes.tweet_id
LEFT JOIN tweets AS RefTweets ON tweets.ref_id = RefTweets.id
WHERE
  users.id = 37 AND tweets.ref_id IS NULL
GROUP BY tweets.id, users.id, RefTweets.id;

CREATE VIEW retweets_and_tweets AS SELECT
  retweets.id,
  tweets.user_id,
  retweets.user_id AS retweet_user_id,
  retweets.tweet_id AS retweet_of_id,
  retweets.created_at AS retweeted_at,
  tweets.created_at,
  tweets.content,
  NULL::integer AS ref_id
FROM retweets
JOIN tweets ON tweets.id = retweets.tweet_id
UNION ALL
SELECT tweets.id,
  tweets.user_id,
  NULL::integer AS retweet_user_id,
  NULL::integer AS retweet_of_id,
  NULL::timestamp without time zone AS retweeted_at,
  tweets.created_at,
  tweets.content,
  tweets.ref_id
FROM tweets;

SELECT id FROM retweets_and_tweets LEFT JOIN users ON users.id = retweets_and_tweets.user_id LEFT JOIN likes ON retweets_and_tweets.id = likes.tweet_id LEFT JOIN tweets AS RefTweets ON retweets_and_tweets.ref_id = RefTweets.id LEFT JOIN users AS RefTweetUsers ON RefTweetUsers.id = RefTweets.user_id LEFT JOIN tweets AS T ON T.ref_id = retweets_and_tweets.id LEFT JOIN retweets ON retweets.tweet_id = retweets_and_tweets.id;

SELECT
  retweets_and_tweets.id,
  retweets_and_tweets.user_id,
  retweets_and_tweets.content,
  retweets_and_tweets.created_at,
  retweets_and_tweets.retweet_of_id,
  users.name,
  users.username,
  RefTweets.id as ref_id,
  RefTweets.content as ref_content,
  RefTweets.created_at as ref_created_at,
  RefTweetUsers.id as ref_user_id,
  RefTweetUsers.name AS ref_user_name,
  RefTweetUsers.username AS ref_user_username,
  COALESCE(
    (SELECT json_agg(attachments.*)
    FROM attachments
    WHERE attachments.tweet_id = retweets_and_tweets.id),
    '[]'
  ) AS attachments,
  CAST(COUNT(DISTINCT likes.tweet_id) AS INTEGER) AS likes,
  CAST(COUNT(DISTINCT T.*) AS INTEGER) AS replies,
  CAST(COUNT(DISTINCT retweets.*) AS INTEGER) AS retweets
FROM (
  SELECT retweets_and_tweets.*
  FROM hashtags
  LEFT JOIN retweets_and_tweets ON retweets_and_tweets.id = hashtags.tweet_id
  WHERE hashtags.hashtag = 'testing'
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
ORDER BY retweets_and_tweets.created_at DESC;

SELECT
  users.id,
  users.name,
  users.username,
  users.created_at,
  users.password,
  CAST(COUNT(DISTINCT tweets.*) AS INTEGER) AS tweet_count,
  CAST(COUNT(DISTINCT followers.*) AS INTEGER) AS follower_count,
  CAST(COUNT(DISTINCT following.*) AS INTEGER) AS following_count
  , (SELECT count(*) = 1
        FROM followers
        WHERE user_id = 37 AND follower_id = 38
      ) AS is_follower,
      (SELECT count(*) = 1
        FROM followers
        WHERE user_id = 38 AND follower_id = 37
      ) AS is_followed_by
FROM users
LEFT JOIN tweets ON tweets.user_id = users.id
LEFT JOIN followers ON followers.user_id = users.id
LEFT JOIN followers AS following ON following.follower_id = users.id
WHERE users.username = 'sahil.936911233'
GROUP BY users.id;