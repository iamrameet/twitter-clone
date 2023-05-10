/**
 * @template { keyof HTMLElementTagNameMap } E
 * @param {E[]} tags
 */
export function html(tags){
  /** @type {{ [tagName in E]: (strings: string[], ...args: any[]) => HTMLElementTagNameMap[tagName] }} */
  const elements = {};
  for(const tagName of tags){
    elements[tagName] = function(strings = [], ...args){
      const element = document.createElement(tagName);
      for(let index = 0; index < strings.length - 1; index++){
        const key = strings[index].replace(/\s|\=/g, "");
        console.log(key)
        element.setAttribute(key, args[index]);
      }
      // console.log(args);
      return element;
    };
  }
  return elements;
}