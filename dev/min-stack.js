/** @template T */
class MinStackNode{

  /** @type {MinStackNode<T> | null} */
  nextMin = null;

  /**
   * @param {T} data
   * @param {MinStackNode<T> | null} next
   */
  constructor(data, next = null){
    this.data = data;
    this.next = next;
  }

};

/** @template T */
class MinStack{

  /** @type {MinStackNode<T> | null} */
  #head = null;
  /** @type {MinStackNode<T> | null} */
  #minHead = null;

  constructor(){}

  peek(){
    return this.#head;
  }

  /** @param {T} data */
  push(data){
    this.#head = new MinStackNode(data, this.#head);
    if(this.#minHead === null) {
      this.#minHead = this.#head;
    } else if(this.#head.data < this.#minHead.data) {
      this.#head.nextMin = this.#minHead;
      this.#minHead = this.#head;
    }
    return this.#head;
  }

  pop(){
    if(this.#head){
      const it = this.#head;
      this.#head = this.#head.next;
      if(this.#minHead === it){
        this.#minHead = this.#minHead.nextMin;
      }
      return it;
    }
    return null;
  }

  min(){
    return this.#minHead;
  }

  *[Symbol.iterator](){
    let it = this.#head;
    while(it){
      yield it.data;
      it = it.next;
    }
  }

  *nodes(){
    let it = this.#minHead;
    while(it){
      yield it;
      it = it.nextMin;
    }
  }

  *mins(){
    let it = this.#minHead;
    while(it){
      yield it.data;
      it = it.nextMin;
    }
  }

};
