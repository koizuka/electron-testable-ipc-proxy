import { injectDataReceiverProxy, injectDataSenderProxy } from "./injectDataProxy";
import { IpcProxyDescriptor } from "./IpcProxyDescriptor";

interface TestInterface {
  doSomething: (param: number) => Promise<void>;
  data: number | undefined;
  promiseData: Promise<string>;
  undefinedData: number | undefined;
}

class TestTemplate implements TestInterface {
  private dontCallMe = new Error("don't call me");
  private dummyPromise = new Promise(() => { }) as Promise<any>;

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
  async doSomething(n: number): Promise<void> { }
  data: number | undefined = 1;
  promiseData = Promise.resolve('hello');
  undefinedData: number | undefined;
}

function isPromise(v: unknown): v is Promise<unknown> {
  return v instanceof Promise;
}

test('injectDataReceiverProxy', async () => {
  const object = new MockClass();
  const { receiver, nextValue } = injectDataReceiverProxy(object, desc);

  expect(object.hasOwnProperty('data')).toBe(false);
  expect(object.data).toBe(undefined);
  expect(object.promiseData).not.toBe(undefined);
  expect(isPromise(object.promiseData)).toBe(true);

  const p = nextValue('data');
  receiver('data', 1);
  expect(object.hasOwnProperty('data')).toBe(true);
  expect(object.data).toBe(1);
  await expect(p).resolves.toBe(1);

  // test promiseData receives value through receiver and resolves
  const promiseDataPromise = object.promiseData;
  receiver('promiseData', 'received-value');
  await expect(promiseDataPromise).resolves.toBe('received-value');

  // make sure data is read only
  expect(() => { object.data = 3; }).toThrow();
});

test('injectDataSenderProxy', async () => {
  const sender = new MockClass();
  sender.data = 1;
  sender.promiseData = new Promise(() => { }); // never resolves

  const receiver = vi.fn<void, [string, unknown]>();
  injectDataSenderProxy(sender, receiver);

  expect(receiver).toHaveBeenCalledWith('data', 1);
  expect(sender.data).toBe(1);

  sender.data = 2;
  expect(receiver).toHaveBeenCalledWith('data', 2);
  expect(sender.data).toBe(2);

  sender.promiseData = Promise.resolve('good-bye');
  await Promise.resolve();
  expect(receiver).toHaveBeenCalledWith('promiseData', 'good-bye');

  sender.undefinedData = 3;
  expect(receiver).not.toHaveBeenCalledWith('undefinedData', 3);

  sender.data = undefined;
  expect(receiver).toHaveBeenCalledWith('data', undefined);
  sender.data = 4;
  expect(receiver).toHaveBeenCalledWith('data', 4);
});
