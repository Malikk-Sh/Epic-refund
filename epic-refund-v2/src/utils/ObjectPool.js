// Object Pooling — НЕ создаём new объекты каждый кадр.
// Снаряды, частицы, числа урона — всё через пул.

export class ObjectPool {
  #pool = [];
  #active = new Set();
  #factory;
  #reset;
  #maxSize;

  constructor(factory, reset, maxSize = 50) {
    this.#factory = factory;
    this.#reset = reset;
    this.#maxSize = maxSize;
  }

  // Получить объект из пула (или создать новый)
  acquire(...args) {
    let obj;

    if (this.#pool.length > 0) {
      obj = this.#pool.pop();
    } else if (this.#active.size < this.#maxSize) {
      obj = this.#factory();
    } else {
      return null;  // Пул исчерпан — пропускаем
    }

    this.#reset(obj, ...args);
    this.#active.add(obj);
    return obj;
  }

  // Вернуть объект в пул
  release(obj) {
    if (!this.#active.has(obj)) return;
    this.#active.delete(obj);
    this.#pool.push(obj);
  }

  // Вернуть все активные объекты
  releaseAll() {
    for (const obj of this.#active) {
      this.#pool.push(obj);
    }
    this.#active.clear();
  }

  get activeCount() { return this.#active.size; }
  get pooledCount() { return this.#pool.length; }

  // Итерация по активным объектам
  forEach(callback) {
    for (const obj of this.#active) {
      callback(obj);
    }
  }

  // Обновление с автовозвратом мёртвых объектов
  update(dt) {
    const toRelease = [];
    for (const obj of this.#active) {
      if (obj.update) {
        const alive = obj.update(dt);
        if (!alive) toRelease.push(obj);
      }
    }
    for (const obj of toRelease) this.release(obj);
  }
}
