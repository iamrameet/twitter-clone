import Logger from "./logger.js";

/** @typedef {Parameters<import("express").RequestHandler>} RHParams */
/** @typedef {Object<string, (params: { request: RHParams[0], response: RHParams[1], next: RHParams[2] }, options: { setFailureCode: (code: number) => void })>} RequestHandlers */
/**
 * @template T
 * @typedef { {} extends T ? never : T} isMethodDefined */

class ExpressController{

  /**
   * @template {RequestHandlers} GET
   * @template {RequestHandlers} POST
   * @template {RequestHandlers} PUT
   * @template {RequestHandlers} DELETE
   * @param {{ get?: GET, post?: POST, put?: PUT, delete?: DELETE }} object
   * @param {string} controllerName
   * @param {{ failureCode?: number }} options
   * @returns {{ get: isMethodDefined<GET>, post: isMethodDefined<POST>, put: isMethodDefined<PUT>, delete: isMethodDefined<DELETE> }}
   */
  static handleWithJSON(controllerName, object, options = {}){
    for(const method in object){
      for(const path in object[method]){
        /** @type {RequestHandlers[string]} */
        const handler = object[method][path];

        object[method][path] = async function(request, response, next){
          let failureCode = options?.failureCode ?? 500;
          try {
            const data = await handler({ request, response, next }, {
              setFailureCode(code){
                failureCode = code;
              }
            });
            response.status(200).json(data);
          } catch(reason) {
            Logger.error(`CONTROLLER_${controllerName}`, reason);
            response.status(failureCode).json({ reason });
          }
        };

      }
    }
    return object;
  }

  /**
   * @template {Object<string, import("express").RequestHandler>} O
   * @param {O} object */
  static object(object){
    return object;
  }
};

export default ExpressController;