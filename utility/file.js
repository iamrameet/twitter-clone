import { writeFile } from "fs/promises";
import Logger from "./logger";

export default class FileHandler{

  static #logger = new Logger("FILE_HANDLER");

  static async writeBuffer(filepath, buffer){
    try{
      await writeFile(filepath, buffer, { encoding: "binary" });
    } catch(ex) {
      this.#logger.error(ex);
      throw "Unable to write in file"
    }
  }

};