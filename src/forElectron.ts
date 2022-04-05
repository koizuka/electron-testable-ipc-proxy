import { IpcProxyDescriptor } from './IpcProxyDescriptor';
import { createProxyObjectFromTemplate } from "./createProxyObjectFromTemplate";

type Handler = { handle: (channel: string, fn: (event: unknown, name: string, ...args: unknown[]) => unknown) => void }
type Invoker = { invoke: (channel: string, ...args: unknown[]) => Promise<unknown> }

/**
 * main processから呼ぶことで、ipcMainに目的のinterface Tを実装したクラスオブジェクトをハンドラとして登録する。
 * @param channel IPCのチャンネル。 createIpcRendererProxy の channel と同じであること。
 * @param impl 目的のinterfaceを実装した処理クラスのインスタンス
 */
function registerIpcMainHandler<T>(ipcMain: Handler, channel: string, impl: T): void {
  const o = createProxyObjectFromTemplate(impl, (key, fn) => fn);

  ipcMain.handle(channel, async (event, name: string, ...args: unknown[]) => {
    if (o[name as keyof T] === undefined) {
      throw new Error(`${name} is not a function`);
    }
    return o[name as keyof T].apply(impl, args);
  });
}

function replaceError(channel: string, cur: string | number | symbol, args: unknown[], e: Error | unknown): Error {
  const remover = `Error invoking remote method '${channel}': Error: `;
  const msg = (e instanceof Error) ? e.message.replace(remover, '') : e;
  return new Error(`Error invoking remote method '${channel}'.${String(cur)}(${JSON.stringify(args).replace(/^\[(.*)\]$/, '$1')}): ${msg}`);
}

/**
 * 目的のinterface TからIPCを通じてmain側の実装を呼び出すproxyを生成する。preload.ts で contextBridge.exposeInMainWorld に与えること。
 * @param channel IPCのチャンネル。registerIpcMainHandler の channel と同じであること。
 * @param from 目的のinterface Tを実装したダミークラスのインスタンス
 * @returns contextBridge.exposeInMainWorld の第2引数に与えるオブジェクト
 */
function createIpcRendererProxy<T extends {}>(ipcRenderer: Invoker, channel: string, from: T): T {
  return createProxyObjectFromTemplate<T, unknown>(from, (cur) => async (...args: unknown[]) => {
    try {
      return await ipcRenderer.invoke(channel, cur, ...args);
    } catch (e: unknown) {
      throw replaceError(channel, cur, args, e);
    }
  }) as T;
}

export function setupForPreload<T extends {}>(descriptor: IpcProxyDescriptor<T>, exposeInMainWorld: (apiKey: string, value: T) => void, ipcRenderer: Invoker): void {
  exposeInMainWorld(descriptor.window, createIpcRendererProxy<T>(ipcRenderer, descriptor.IpcChannel, descriptor.template));
}

export function setupForMain<T extends {}>(descriptor: IpcProxyDescriptor<T>, ipcMain: Handler, impl: T): void {
  registerIpcMainHandler<T>(ipcMain, descriptor.IpcChannel, impl);
}
