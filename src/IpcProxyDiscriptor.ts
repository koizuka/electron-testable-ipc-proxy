
export type IpcProxyDiscriptor<T> = {
  window: string;
  IpcChannel: string;
  template: T;
};
