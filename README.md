
## electron-testable-ipc-proxy

provides a mechanism to call methods defined as interface `T` implemented in the main process from preload via IPC.

once defined descriptor D as `IpcProxyDescriptor<T>` and initialized with `setupForMain<D>`, `setupForPreload<D>` and `setupForTest<D>`, you can use the object implements T in the main process, preload in render process and unit tests respectively.

### IpcProxyDescriptor

```typescript
import { IpcProxyDescriptor } from 'electron-testable-ipc-proxy';

type IpcProxyDescriptor<T> = {
  window: string;
  IpcChannel: string;
  template: T;
};
```

describe common parameters for electron-testable-ipc-proxy.

* `T`: interface `T` described above.
* `window`: define the name to assign into global object `window`.
* `IpcChannel`:  IPC channel name to communicate between main process and renderer process.
* `template`: class instance object with dummy methods declared in interface T. used only names of methods.

### setupForMain

```typescript
import { setupForMain } from 'electron-testable-ipc-proxy';

function setupForMain<T>(Descriptor: IpcProxyDescriptor<T>, ipcMain, impl: T): void
```

* should be called in main process of Electron before loading the page in BrowserWindow.
* `impl` pass an instance which implemented `T` to be called from renderer process throu IPC named by Descriptor.IpcChannel.
* `ipcMain`: pass `ipcMain` of Electron.

### setupForPreload

```typescript
import { setupForPreload } from 'electron-testable-ipc-proxy';

function setupForPreload<T>(Descriptor: IpcProxyDescriptor<T>, exposeInMainWorld, ipcRenderer): void
```

* should be called in preload module in renderer process of Electron.
* setups proxy object into global `window` object as named by  `descriptor.window`.
* `exposeInMainWorld`: pass `contextBridge.exposeInMainWorld` of Electron.
* `ipcRenderer`: pass `ipcRenderer` of Electron.

### setupForTest

```typescript
import { setupForTest } from 'electron-testable-ipc-proxy';

function setupForTest<T, U>(Descriptor: IpcProxyDescriptor<T>, fn: (key: keyof T, fn: (...args: unknown[]) => unknown) => U): {
  [k in keyof T]: U;
}
```

* to use with jest, should be called this in a module which imported before the test target module.
* this function creates an object implements each methods of T by given `fn` (pass `jest.fn()` for jest) to be accessed from your tests, and injects to global `window` object to be called from test target.
  
## Example code

full code are in [here](https://github.com/koizuka/react-typescript-electron-sample-with-create-react-app-and-electron-builder).

* electron/@types/MyAPI.d.ts

```typescript
export interface MyAPI {
  openDialog: () => Promise<void | string[]>;
}
```

* electron/@types/global.d.ts

```typescript
import { MyAPI } from "./MyAPI";

declare global {
  interface Window {
    myAPI: MyAPI;
  }
}
```

* src/MyAPIDescriptor.ts

```typescript
class MyAPITemplate implements MyAPI {
  private dontCallMe = new Error("don't call me");

  openDialog(): Promise<never> { throw this.dontCallMe; }
}

export const MyAPIDescriptor: IpcProxyDescriptor<MyAPI> = {
  window: 'myAPI',
  IpcChannel: 'my-api',
  template: new MyAPITemplate(),
}
```

* electron/preload.ts

```typescript
setupForPreload(MyAPIDescriptor, contextBridge.exposeInMainWorld, ipcRenderer);
```

* electron/main.ts

```typescript
class MyApiServer implements MyAPI {
  constructor(readonly mainWindow: BrowserWindow) {
  }

  async openDialog() {
    const dirPath = await dialog
      .showOpenDialog(this.mainWindow, {
        properties: ['openDirectory'],
      })
      .then((result) => {
        if (result.canceled) return;
        return result.filePaths[0];
      })
      .catch((err) => console.log(err));

    if (!dirPath) return;

    return fs.promises
      .readdir(dirPath, { withFileTypes: true })
      .then((dirents) =>
        dirents
          .filter((dirent) => dirent.isFile())
          .map(({ name }) => path.join(dirPath, name)),
      );
  }
};
...
  const myApi = new MyApiServer(win);
  setupForMain(MyAPIDescriptor, ipcMain, myApi);
```

* src/App.tsx

```tsx
const { myAPI } = window;

function App() {
  const [files, setFiles] = useState<string[]>([]);
  const [buttonBusy, setButtonBusy] = useState(false);

  return (
    <div className="App">
      <header className="App-header">
         ...
        <button disabled={buttonBusy} onClick={async () => {
          setButtonBusy(true);
          const files = await myAPI.openDialog();
          if (Array.isArray(files)) {
            setFiles(files);
          } else {
            setFiles([]);
          }
          setButtonBusy(false);
        }} data-testid="open-dialog">open dialog</button>
        <ul>
          {files.map((file, index) => (
            <li key={file} data-testid={`file${index}`}>{file}</li>
          ))}
        </ul>
      </header>
    </div>
  );
}
```

* src/mock/myAPI.ts

```typescript
export const myAPI = setupForTest(MyAPIDescriptor, () => jest.fn());
```

* src/App.test.tsx

```typescript
import { myAPI } from './mock/myAPI';
import App from './App';

test('open files when button clicked', async () => {
  myAPI.openDialog.mockResolvedValue(['file1.txt', 'file2.txt']);
  render(<App />);

  const button = screen.getByTestId('open-dialog');
  expect(button).toBeInTheDocument();
  expect(button.innerHTML).toBe('open dialog');

  expect(button).toBeEnabled();
  fireEvent.click(button);
  expect(button).toBeDisabled();

  await waitFor(() => screen.getByTestId('file0'));

  expect(myAPI.openDialog).toHaveBeenCalled();

  expect(screen.getByTestId('file0')).toHaveTextContent('file1.txt');
  expect(screen.getByTestId('file1')).toHaveTextContent('file2.txt');
  expect(screen.queryByTestId('file2')).toBeNull();
});
```

## memo

現在は MyAPITemplate で手で必要なメソッドの名前を持つダミーを並べないといけないが interface から自動生成したい。
しかし、create-react-app だと TypeScriptに transformer などを差し込む方法が見あたらない。
