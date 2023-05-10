import { PGPool } from "../../database/postgress.js";
import hash from "../../utility/hash.js";

class OTP {
  /**
   * @param {string} key
   * @param {string} otp
  */
  constructor(key, otp){
    this.key = key;
    this.otp = otp;
  }
  /** @param {Partial<OTP>} otp */
  static from(otp){
    return new this(otp.key, otp.otp);
  }
};

class OTPService {

  /** @type {PGPool<OTP>} */
  static #pool = new PGPool;
  static #otpCounter = 0;

  static async generate(key){
    const query = `INSERT INTO otps(key, otp) VALUES($1, $2) RETURNING *;`;
    const timestamp = (Math.floor((Date.now() + this.#otpCounter++)) % 1000000).toString().padEnd(6, "0")
    const hashedKey = await hash(timestamp, key);
    const otp = timestamp;
    const result = await this.#pool.tryQuery("Something went wrong while generating OTP", query, [ hashedKey, otp ]);
    // queue clearOTP task
    return OTP.from(result.rows[0]);
  }

  static async verify(otp, key){
    const query = `SELECT * FROM otps WHERE key=$2 AND otp=$1;`;
    const result = await this.#pool.tryQuery("Unable to verify OTP", query, [ otp, key ]);
    if(result.rowCount !== 1){
      throw "Invalid OTP"
    }
    return result.rows[0];
  }

  static async destroy(otp){
    const query = `DELETE FROM otps WHERE otp=$1;`;
    await this.#pool.tryQuery("Unable to destroy OTP", query, [ otp ]);
    return true;
  }

  static async verifyAndDestroy(otp, key){
    await this.verify(otp, key);
    return await this.destroy(otp);
  }

};

export default OTPService;