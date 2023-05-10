import pg from "pg";
import { DB } from "../config.js";
import Logger from "../utility/logger.js";

/** @typedef {[ query: string, values: [], options?: { exception?: string, inResult?: boolean, passPrevResult?: boolean } ]} QueriesDataReturns */

/** @template T */
class PGPool{

  #logger = new Logger("PGPool");

  #pool;
  constructor(){
    this.#pool = new pg.Pool(DB);
  }

  /**
   * @param {string | Error} exception
   * @param {string} query
   * @param {any[]} values
   * @returns {Promise<pg.QueryResult<T>>}
   */
  async tryQuery(exception, query, values){
    try{
      return await this.#pool.query(query, values);
    } catch(ex) {
      this.#logger.error("tryQuery():", ex);
      throw exception ?? ex;
    }
  }

  /**
   * @param {string | Error} exception
   * @param {((result?: import("pg").QueryResult<T>) => Promise<QueriesDataReturns>)[]} data
   * @returns {Promise<pg.QueryResult<T>>}
   */
  async tryQueries(exception, ...data){
    let modifiedEx = exception;
    try{
      let finalResult = [];
      let prevResult;
      for(const exec of data){
        if(exec){
          const [ query, values, options] = await exec(prevResult);
          modifiedEx = options?.exception ?? exception;
          const result = await this.#pool.query(query, values);
          finalResult.push(options?.inResult === true ? result : null);
          if(!options?.passPrevResult){
            prevResult = result;
          }
        } else finalResult.push(null);
      }
      return finalResult.filter(r => r !== null).length > 0 ? finalResult : prevResult;
    } catch(ex) {
      this.#logger.error("tryQueries():", ex);
      throw modifiedEx ?? ex;
    }
  }

  /** @returns { Promise<pg.PoolClient & { tryQueries: (...args: Parameters<typeof PGPoolClient["tryQueries"]>) => Promise<pg.QueryResult<T>> }> } */
  async connect(){
    const client = await this.#pool.connect();
    return {
      ...client,
      tryQueries: PGPoolClient.tryQueries.bind(client)
    }
  }
};

class PGPoolClient{
  /**
   * @template T
   * @param {string | Error} exception
   * @param {((result?: import("pg").QueryResult<T>) => Promise<QueriesDataReturns>)[]} data
   * @returns {Promise<pg.QueryResult<T>>}
   */
  static async tryQueries(exception, ...data){
    let modifiedEx = exception;
    try{
      let finalResult = [];
      let prevResult;
      await this.query("BEGIN;");
      for(const exec of data){
        if(exec){
          const [ query, values, options] = await exec(prevResult);
          console.table({query})
          modifiedEx = options?.exception ?? exception;
          const result = await this.query(query, values);
          finalResult.push(options?.inResult === true ? result : null);
          if(!options?.passPrevResult){
            prevResult = result;
          }
        } else finalResult.push(null);
      }
      await this.query("COMMIT;");
      return finalResult.filter(r => r !== null).length > 0 ? finalResult : prevResult;
    } catch(ex) {
      await this.query("ROLLBACK;");
      Logger.error("PGPoolClient::tryQueries():", ex);
      throw exception ?? ex;
    } finally {
      this.release();
    }
  }
};

export { PGPool };