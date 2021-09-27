import { createProxyObjectFromTemplate } from './createProxyObjectFromTemplate';
import { IpcProxyDiscriptor } from './IpcProxyDiscriptor';


export function setupForTest<T, U>(discriptor: IpcProxyDiscriptor<T>, fn: (key: keyof T, fn: (...args: unknown[]) => unknown) => U): {
  [k in keyof T]: U;
} {
  const mock = createProxyObjectFromTemplate(discriptor.template, fn);

  Object.defineProperty(window, discriptor.window, { value: mock });
  return mock;
}
