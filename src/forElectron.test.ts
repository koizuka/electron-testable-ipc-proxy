import { setupForMain, setupForPreload } from "./forElectron";
import { IpcProxyDescriptor } from "./IpcProxyDescriptor";

interface TestInterface {
  doSomething: (param: number) => Promise<void>;
}

class TestTemplate implements TestInterface {
  private dontCallMe = new Error("don't call me");

  doSomething(): Promise<never> { throw this.dontCallMe; }
}

const desc: IpcProxyDescriptor<TestInterface> = {
  window: 'window',
  IpcChannel: 'test',
  template: new TestTemplate(),
};

class MockClass implements TestInterface {
  async doSomething(n: number): Promise<void> { }
}

describe('setupForMain', () => {
  const handler: { [channel: string]: (event: unknown, name: string, ...args: unknown[]) => unknown } = {};
  const handle = (channel: string, fn: (event: unknown, name: string, ...args: unknown[]) => unknown) => {
    handler[channel] = fn;
  };
  const mock = new MockClass();
  mock.doSomething = jest.fn<Promise<void>, [number]>();

  setupForMain(desc, { handle }, mock);
  expect(handler[desc.IpcChannel]).toBeDefined();
  expect(Object.keys(handler).length).toBe(1);

  test('doSomething', async () => {
    handler[desc.IpcChannel]({}, 'doSomething', 1);
    expect(mock.doSomething).toBeCalledWith(1);
  });
});

describe('setupForPreload', () => {
  const exposed: { [apiKey: string]: unknown } = {};

  const exposeInMainWorld = (apiKey: string, value: TestInterface) => {
    exposed[apiKey] = value;
  };
  const invoke = jest.fn<Promise<void>, [string, ...unknown[]]>();

  setupForPreload(desc, exposeInMainWorld, { invoke });
  expect(exposed[desc.window]).toBeDefined();
  expect(Object.keys(exposed).length).toBe(1);

  test('doSomething', async () => {
    const proxy = exposed[desc.window] as TestInterface;
    await proxy.doSomething(1);
    expect(invoke).toBeCalledWith(desc.IpcChannel, 'doSomething', 1);
  });
});
