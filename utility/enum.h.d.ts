type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

type RecordToObject<T extends Record<string, string>> = {
  [K in keyof T]: T[K]
}

declare function EnumN<T extends string[]>(...args: T): UnionToIntersection<{
  [K in keyof T]: K extends string ? Record<T[K], K> : never;
}[number]>;