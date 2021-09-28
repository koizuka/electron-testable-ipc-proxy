
export type IpcProxyDescriptor<T> = {
  window: string;
  IpcChannel: string;
  template: T;
};
