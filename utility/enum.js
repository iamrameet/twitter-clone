/// <reference path="enum.h.d.ts"/>

/**
 * @template {Record<T, string>} T
 * @param {T} args
*/
export default function Enum(...args){
  /** @type {{ [key in T[number]]: symbol }} */
  const object = {};
  for(const num of args){
    object[num] = Symbol();
  }
  return Object.freeze(object);
}

/**
 * @template {Record<T, string>} T
 * @param {T} args
 * @returns {UnionToIntersection<{ [K in keyof T]: K extends string ? Record<T[K], `${ K }`> : never; }[number]>}
*/
export function Enum2(...args){
  /** @type {{ [key in T[number]]: 2 ** number }} */
  const object = {};
  for(const index in args){
    object[args[index]] = 2 ** index;
  }
  return Object.freeze(object);
}