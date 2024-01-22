import { IpcProxyDescriptor } from "./IpcProxyDescriptor";

function isPromise(v: unknown): v is Promise<unknown> {
  return v instanceof Promise;
}

/** inject getter/setter to data members(which value is NOT `undefined`) of the target.
 *     - setter: store the value and call fn (expected to send the value via IPC).
*      - getter: read the stored value.
 *   call fn each data members(except Promise)'s initial value from this function.
 *
 *   NOTE:
 *     if the value is yet undetermined when initialization time, use Promise rather than value `undefined`.
 *     property initialized with `undefined` will not be injected proxy.
 */
export function injectDataSenderProxy<T extends object>(target: T, fn: (key: keyof T, value: unknown) => void): void {
  const keys = (Object.getOwnPropertyNames(target) as (keyof T)[]).filter(key => typeof target[key] !== 'function');
  if (keys.length === 0) {
    return;
  }

  const data: { [k in keyof T]?: unknown; } = {};

  const defineKey = (key: keyof T, initialValue: unknown) => {
    Object.defineProperty(target, key, {
      set: (value) => {
        data[key] = value;
        if (isPromise(value)) {
          value.then(v => {
            fn(key, v);
          });
        } else {
          fn(key, value);
        }
      },
      get: () => data[key],
      enumerable: true,
    });

    data[key] = initialValue;
    if (!isPromise(initialValue) && initialValue !== undefined) {
      fn(key, initialValue);
    }
  };

  for (const key of keys) {
    defineKey(key, target[key]);
  }
}

/** receiver:
 *   - data member: read only
 *     - Promise: resolve when initial value has received
 *     - other: `undefined` before initial value has received
 * 
 *   - receiver(key, value): call when value has received. data member is set to the value
 *   - nextValue(key): resolve when next value has received
 */
export function injectDataReceiverProxy<T extends object>(target: T, desc: IpcProxyDescriptor<T>): {
  receiver: (key: keyof T, value: unknown) => void,
  nextValue: (key: keyof T) => Promise<unknown>,
} {
  const from: T = desc.template;
  const keys = (Object.getOwnPropertyNames(from) as (keyof T)[]).filter(key => typeof from[key] !== 'function');

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(target, key)) {
      delete target[key];
    }
  }

  const data: { [k in keyof T]: {
    value?: unknown;
    promise: Promise<unknown> | null;
    resolver: ((value: unknown) => void) | null;
  } } =
    keys.reduce(
      (prev, key) => {
        prev[key] = {
          promise: null,
          resolver: null,
        };
        return prev;
      },
      {} as { [k in keyof T]: {
        value?: unknown;
        promise: Promise<unknown> | null;
        resolver: ((value: unknown) => void) | null;
      } },
    );

  const nextValue = (key: keyof T) => {
    if (data[key].promise === null) {
      data[key].promise = new Promise((resolve) => {
        data[key].resolver = resolve;
      });
    }
    return data[key].promise as Promise<unknown>;
  };

  for (const key of keys) {
    if (isPromise(from[key])) {
      Object.defineProperty(target, key, {
        get: () => nextValue(key),
      });
    }
  }

  return {
    receiver: (key: keyof T, value: unknown) => {
      if (!Object.prototype.hasOwnProperty.call(data, key)) {
        throw new Error(`unknown key: ${String(key)}`);
      }
      if (typeof from[key] === 'function') {
        throw new Error(`key is function: ${String(key)}`);
      }

      if (!Object.prototype.hasOwnProperty.call(target, key)) {
        Object.defineProperty(target, key, {
          get: () => {
            if (!Object.prototype.hasOwnProperty.call(data, key) || !Object.prototype.hasOwnProperty.call(data[key], 'value')) {
              return undefined; // not yet received
            }
            const d = data[key] as { value: unknown };
            return d.value;
          }
        });
      }

      data[key].value = value;
      const resolver = data[key].resolver;
      if (resolver !== null) {
        resolver(value);
        data[key].resolver = null;
        data[key].promise = null;
      }
    },

    nextValue,
  };
}
