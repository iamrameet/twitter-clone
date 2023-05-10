import Mailjet from "node-mailjet";
import { Mail } from "../config.js";
import { User } from "../server/services/user.js";
import Logger from "./logger.js";

class Mailer{

  static #logger = new Logger("Mailer");

  static #client = Mailjet.apiConnect(Mail.apiKey, Mail.apiSecret);

  /**
   * @param {User["email"]} email
   * @param {User["name"]} name
   * @param {string} otp
  */
  static async sendVerificationMail(email, name, otp){
    try {
      return await this.#client.post("send", { version: "v3.1" }).request({
        Messages: [{
          From: {
            Email: "ramitmashta@gmail.com",
            Name: "Twitter Clone"
          },
          To: [{
            Email: email,
            Name: name
          }],
          Subject: "Twitter Clone - E-mail verification",
          TextPart: "Verification OTP:",
          HTMLPart: `<h3>${otp}</h3>`
        }]
      });
    } catch(ex) {
      this.#logger.error(ex);
      throw "Unable to send verification mail";
    }
  }

};

export default Mailer;