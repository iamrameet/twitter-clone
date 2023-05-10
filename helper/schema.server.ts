interface NotificationTypeContentMap {
  follow: { followerId: number };
  reply: {
    userId: number;
    tweetId: number;
  };
  retweet: {
    userId: number;
    tweetId: number;
  };
  like: {
    userId: number;
    tweetId: number;
  };
  mention: {
    userId: number;
    tweetId: number;
  }
  login: {};
}

type NotificationSchema<T extends keyof NotificationTypeContentMap> = {
  id: number;
  user_id: number;
  type: T;
  content: NotificationTypeContentMap[T];
  is_read: boolean;
  created_at: number;
};