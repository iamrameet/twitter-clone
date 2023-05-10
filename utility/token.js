import jwt from "jsonwebtoken";
import { Token } from "../config.js";
import Logger from "./logger.js";

class JWT {

  static #logger = new Logger("JWT");
  static create(payload, options){

    return new Promise((resolve, reject) => {

      jwt.sign(payload, Token.key, options, (error, token) => {
        if(error){
          this.#logger.error(error);
          return void reject("Something went wrong");
        }
        console.log("create",token);
        resolve(token);
      });

    });
  }

  /** @type {(token: string) Promise<string | jwt.JwtPayload>} */
  static read(token){
    return new Promise((resolve, reject) => {
      jwt.verify(token, Token.key, (error, payload) => {
        if(error){
          // this.#logger.error(error);
          return void reject("Invalid token");
        }
        if(payload.exp >= Date.now()){
          return void reject("Token expired");
        }
        resolve(payload);
      });
    });
  }

};

export default JWT;