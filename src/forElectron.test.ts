import { describe, expect, test, vi } from "vitest";
import { setupForMain, setupForPreload } from "./forElectron";
import { IpcProxyDescriptor } from "./IpcProxyDescriptor";

interface TestInterface {
  doSomething: (param: number | string) => Promise<void>;
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async doSomething(n: string | number): Promise<void> { }
}

describe('setupForMain', () => {
  const handler: { [channel: string]: (event: unknown, name: string, ...args: unknown[]) => unknown } = {};
  const handle = (channel: string, fn: (event: unknown, name: string, ...args: unknown[]) => unknown) => {
    handler[channel] = fn;
  };
  const mock = new MockClass();
  mock.doSomething = vi.fn<[number], Promise<void>>();

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
  const invoke = vi.fn<[string, ...unknown[]], Promise<void>>()
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce(new Error(`Error invoking remote method '${desc.IpcChannel}': Error: invoke`));

  setupForPreload(desc, exposeInMainWorld, { invoke });
  expect(exposed[desc.window]).toBeDefined();
  expect(Object.keys(exposed).length).toBe(1);

  test('doSomething', async () => {
    const proxy = exposed[desc.window] as TestInterface;

    await proxy.doSomething(1);
    expect(invoke).toBeCalledWith(desc.IpcChannel, 'doSomething', 1);

    await expect(proxy.doSomething('a')).rejects.toThrow(`'test'.doSomething("a"): invoke`);
    expect(invoke).toBeCalledWith(desc.IpcChannel, 'doSomething', 'a');
  });
});
