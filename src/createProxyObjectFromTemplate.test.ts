import { createProxyObjectFromTemplate } from "./createProxyObjectFromTemplate"

interface TestInterface {
  doSomething: (param: number) => void;
  doAnother: (param: string) => string;
};

class TestClass implements TestInterface {
  doSomething(param: number) { }
  doAnother(param: string) { return param; }
};

test('createProxyObjectFromTemplate inject functions', () => {
  const mock = createProxyObjectFromTemplate(new TestClass() as TestInterface, () => jest.fn());
  const target = mock as TestInterface;

  target.doSomething(42);
  expect(mock.doSomething).toBeCalledWith(42);

  mock.doAnother.mockReturnValue('test');
  expect(target.doAnother('hello')).toBe('test');
  expect(mock.doAnother).toBeCalledWith('hello');
})

test('createProxyObjectFromTemplate throw is not an class instance', () => {
  const badObject = {
    doSomething: (param: number) => { /* do nothing */ },
    doAnother: (param: string) => param,
  };
  expect(() => createProxyObjectFromTemplate(badObject as TestInterface, () => jest.fn())).toThrow();
})

