
export type IpcProxyDescriptor<T extends {}> = {
  window: string;
  IpcChannel: string;
  template: T;
};
