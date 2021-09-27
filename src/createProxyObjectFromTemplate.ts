
/**
 * interface T (関数以外のメンバーを持たないこと)を実装したクラスのオブジェクト from をテンプレートとして、
 * interface Tにあるメソッド名すべてに引数 fn が返した関数を割り当てたオブジェクトを返す。
 * @param from interface T を実装したクラスのオブジェクトを as T して渡す
 * @param fn keyに対応した関数を返す関数
 * @returns 作成されたオブジェクト
 */
export function createProxyObjectFromTemplate<T, U>(from: T, fn: (key: keyof T, fn: (...args: unknown[]) => unknown) => U): { [k in keyof T]: U; } {
  const keys = Object.getOwnPropertyNames(Object.getPrototypeOf(from));
  if (keys.includes('__proto__')) {
    throw new Error('createProxyObjectFromTemplate: must be an class instance');
  }

  const entries = (keys as (keyof T)[])
    .filter(key => typeof from[key] === 'function' && key !== 'constructor')
    .map((key) => [key, fn(key, from[key] as unknown as (...args: unknown[]) => unknown)]);

  return Object.fromEntries(entries);
}
