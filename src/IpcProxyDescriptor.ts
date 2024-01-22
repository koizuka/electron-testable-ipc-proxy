
export type IpcProxyDescriptor<T extends object> = {
  window: string;
  IpcChannel: string;
  template: T;
};
