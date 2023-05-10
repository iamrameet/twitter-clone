export default class DateTime {

  #timestamp;

  /** @param {number} timestamp */
  constructor(timestamp){
    this.#timestamp = timestamp;
  }

  msecsTillNow(){
    return Date.now() - this.#timestamp;
  }

};