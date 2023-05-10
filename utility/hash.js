import crypto from "crypto";
import { Hashing } from "../config.js";

// const salt = crypto.randomBytes(16).toString("hex"); // generate a random salt

export default async function hash(text, withText){

  // hash the text using PBKDF2 with 1000 iterations, a key length of 64 bytes, and the SHA-512 algorithm
  const hashed = crypto.pbkdf2Sync(text + "=" + withText, Hashing.salt, 1000, 64, "sha512").toString("hex");

  return hashed;
};