export declare interface NotificationTypeContentMap {
  follow: {
    follower: {
      id: number,
      name: string;
      username: string;
      image: string;
    }
  };
  reply: {
    user: {
      id: number,
      name: string;
      username: string;
      image: string;
    }
  };
  like: {
    user: {
      id: number,
      name: string;
      username: string;
      image: string;
    }
  };
  retweet: {
    user: {
      id: number,
      name: string;
      username: string;
      image: string;
    }
  };
  mention: {
    user: {
      id: number,
      name: string;
      username: string;
      image: string;
    }
  };
  login: {
  };
}

export declare type NotificationSchema<T extends keyof NotificationTypeContentMap> = {
  id: number;
  user_id: number;
  type: T;
  content: NotificationTypeContentMap[T];
  is_read: boolean;
  created_at: number;
};