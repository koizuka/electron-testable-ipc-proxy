import { describe, expect, test, vi } from "vitest";
import { IpcProxyDescriptor } from "./IpcProxyDescriptor";
import { injectDataReceiverProxy, injectDataSenderProxy } from "./injectDataProxy";

interface TestInterface {
  doSomething: (param: number) => Promise<void>;
  data: number | undefined;
  promiseData: Promise<string>;
  undefinedData: number | undefined;
}

class TestTemplate implements TestInterface {
  private dontCallMe = new Error("don't call me");
  private dummyPromise = new Promise<string>(() => { });

  doSomething(): Promise<never> { throw this.dontCallMe; }
  data: number | undefined = 42; // dummy value
  promiseData = this.dummyPromise;
  undefinedData: number | undefined;
}

const desc: IpcProxyDescriptor<TestInterface> = {
  window: 'window',
  IpcChannel: 'test',
  template: new TestTemplate(),
};

class MockClass implements TestInterface {
  async doSomething(): Promise<void> { }
  data: number | undefined = 1;
  promiseData = Promise.resolve('hello');
  undefinedData: number | undefined;
}

function isPromise(v: unknown): v is Promise<unknown> {
  return v instanceof Promise;
}

describe('injectDataReceiverProxy', () => {
  const object = new MockClass();
  const { receiver, nextValue } = injectDataReceiverProxy(object, desc);

  test('initial value', () => {
    expect(Object.prototype.hasOwnProperty.call(object, 'data')).toBe(false);
    expect(object.data).toBe(undefined);
    expect(object.promiseData).not.toBe(undefined);
    expect(isPromise(object.promiseData)).toBe(true);
  });

  test('inject new Promise value', async () => {
    const p = nextValue('promiseData');
    receiver('promiseData', 'hi');
    await expect(p).resolves.toBe('hi');
  });

  test('inject new value', async () => {
    const p = nextValue('data');
    receiver('data', 1);
    expect(Object.prototype.hasOwnProperty.call(object, 'data')).toBe(true);
    expect(object.data).toBe(1);
    await expect(p).resolves.toBe(1);
  });

  test('forbid change value directly', () => {
    expect(() => { object.data = 3; }).toThrowError();
  });
});

test('injectDataSenderProxy', async () => {
  const sender = new MockClass();
  sender.data = 1;
  sender.promiseData = new Promise(() => { }); // never resolves

  const receiver = vi.fn<[string, unknown], void>();
  injectDataSenderProxy(sender, receiver);

  expect(receiver).toBeCalledWith('data', 1);
  expect(sender.data).toBe(1);

  sender.data = 2;
  expect(receiver).toBeCalledWith('data', 2);
  expect(sender.data).toBe(2);

  sender.promiseData = Promise.resolve('good-bye');
  await Promise.resolve();
  expect(receiver).toBeCalledWith('promiseData', 'good-bye');

  sender.undefinedData = 3;
  expect(receiver).not.toBeCalledWith('undefinedData', 3);

  sender.data = undefined;
  expect(receiver).toBeCalledWith('data', undefined);
  sender.data = 4;
  expect(receiver).toBeCalledWith('data', 4);
});
