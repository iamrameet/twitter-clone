import Logger from "../utility/logger.js";
import JWT from "../utility/token.js";
import express from "express";

/**
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
*/
export default async function userAuth(request, response, next){
  const authToken = request.cookies["auth-token"];
  if(!authToken){
  }
  try{
    const data = await JWT.read(authToken);
    // request.tokenData = data;
    response.locals.tokenData = data;
    next();
  } catch(ex) {
    Logger.error("USER_AUTH", "IP: " + request.ip + ", Message: " + ex);
    response.status(500).send(ex);
  }
}


/**
 * @param {express.Request} request
 * @param {express.Response} response
 * @param {express.NextFunction} next
*/
export async function tryUserAuth(request, response, next){
  const authToken = request.cookies["auth-token"];
  if(!authToken){
  }
  try{
    const data = await JWT.read(authToken);
    // request.tokenData = data;
    response.locals.tokenData = data;
  } catch(ex) {
    console.log(ex);
    response.locals.tokenData = {};
  }
  next();
}