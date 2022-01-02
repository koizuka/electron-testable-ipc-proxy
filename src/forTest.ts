import { createProxyObjectFromTemplate } from './createProxyObjectFromTemplate';
import { IpcProxyDescriptor } from './IpcProxyDescriptor';


export function setupForTest<T extends {}, U>(descriptor: IpcProxyDescriptor<T>, fn: (key: keyof T, fn: (...args: unknown[]) => unknown) => U): {
  [k in keyof T]: U;
} {
  const mock = createProxyObjectFromTemplate(descriptor.template, fn);

  Object.defineProperty(window, descriptor.window, { value: mock });
  return mock;
}
