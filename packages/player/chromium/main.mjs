import { spawn } from 'node:child_process';
import { mkdir, readFile, realpath } from 'node:fs/promises';
import { homedir } from 'node:os';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  nativeImage,
  net,
  protocol,
  session,
} from 'electron';
import { DatabaseSync } from 'node:sqlite';

const player = fileURLToPath(new URL('../', import.meta.url));
const scheme = 'nuclear';
const origin = `${scheme}://app`;
const entry = `${origin}/`;
const allowedPage = (url) => url.startsWith(`${origin}/`);
const startupTimeoutMs = 20000;
const profileIndex = process.argv.indexOf('--profile');
const profile =
  profileIndex >= 0 ? (process.argv[profileIndex + 1] ?? '') : null;
if (profile !== null && !/^[\w-]+$/.test(profile)) {
  throw new Error(
    '--profile needs a name containing only letters, digits, hyphens, or underscores',
  );
}
const identifier = profile
  ? `com.nuclearplayer.profile.${profile}`
  : 'com.nuclearplayer';
const dataDirectory = join(
  process.env.XDG_DATA_HOME || join(homedir(), '.local/share'),
  identifier,
);
const userData = join(app.getPath('appData'), `${identifier}.chromium`);
await mkdir(userData, { mode: 0o700, recursive: true });
app.setPath('userData', userData);
app.setName('Nuclear');
app.setDesktopName('Nuclear.desktop');

protocol.registerSchemesAsPrivileged([
  {
    scheme,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

const pending = new Map();
let nextRequest = 0;
let child;
let window;
let preferences = [];
let stopping = false;

function shutdown() {
  stopping = true;
  child?.stdin.end();
}

function stopPending(error) {
  for (const settle of pending.values()) {
    settle({ error });
  }
  pending.clear();
}

function startBackend() {
  return new Promise((ready, fail) => {
    const args = profile ? ['--profile', profile] : [];
    child = spawn(
      process.env.NUCLEAR_CHROMIUM_BACKEND ||
        '/usr/lib/nuclear-chromium/nuclear-music-player',
      args,
      {
        argv0: '/usr/bin/nuclear-music-player',
        env: { ...process.env, NUCLEAR_CHROMIUM_HOST: 'stdio' },
        stdio: ['pipe', 'pipe', 'inherit'],
      },
    );
    const timer = setTimeout(
      () => fail(new Error('The Nuclear backend did not start')),
      startupTimeoutMs,
    );
    child.stdin.on('error', (error) => stopPending(error.message));
    child.on('error', (error) => {
      clearTimeout(timer);
      fail(error);
      stopPending(error.message);
    });
    child.on('exit', (code, signal) => {
      const error = `The Nuclear backend exited (${signal ?? code})`;
      const normalShutdown =
        stopping || code === 0 || signal === 'SIGTERM' || signal === 'SIGINT';
      clearTimeout(timer);
      if (normalShutdown) {
        stopping = true;
      }
      fail(new Error(error));
      stopPending(error);
      if (window && !window.isDestroyed()) {
        if (!normalShutdown) {
          console.error(error);
          dialog.showErrorBox('Nuclear', error);
        }
        app.quit();
      }
    });
    createInterface({ input: child.stdout }).on('line', (line) => {
      let response;
      try {
        response = JSON.parse(line);
      } catch {
        return;
      }
      if (response.ready === true) {
        clearTimeout(timer);
        ready();
      } else if (
        Number.isInteger(response.callback) &&
        window &&
        !window.isDestroyed()
      ) {
        window.webContents.send(
          'nuclear:callback',
          response.callback,
          response.value,
        );
      } else if (pending.has(response.id)) {
        const settle = pending.get(response.id);
        pending.delete(response.id);
        settle(response);
      }
    });
  });
}

function invokeBackend(command, args, options) {
  return new Promise((settle) => {
    const id = ++nextRequest;
    if (!child?.stdin.writable) {
      settle({ error: 'The Nuclear backend is unavailable' });
      return;
    }
    pending.set(id, settle);
    child.stdin.write(
      JSON.stringify({ id, command, args, options }) + '\n',
      (error) => {
        if (error && pending.delete(id)) {
          settle({ error: error.message });
        }
      },
    );
  });
}

function validSender(event) {
  if (!window || window.isDestroyed() || event.sender.isDestroyed()) {
    return false;
  }
  const frame = event.senderFrame;
  return (
    event.sender === window.webContents &&
    frame &&
    frame === event.sender.mainFrame &&
    allowedPage(frame.url)
  );
}

async function invoke(event, command, args, options) {
  if (!validSender(event) || typeof command !== 'string') {
    return { error: 'Invalid Nuclear IPC sender' };
  }
  switch (command) {
    case 'plugin:window|show':
      if (!window.isVisible()) {
        window.maximize();
      }
      window.show();
      break;
    case 'plugin:window|set_focus':
      window.focus();
      break;
    case 'plugin:window|minimize':
      window.minimize();
      break;
    case 'plugin:window|is_maximized':
      return { value: window.isMaximized() };
    case 'plugin:window|toggle_maximize':
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
      break;
    case 'plugin:window|close':
      window.close();
      break;
    case 'plugin:window|set_decorations':
    case 'plugin:window|set_minimizable':
    case 'plugin:window|start_dragging':
      break;
    case 'plugin:process|restart':
      app.relaunch();
      app.quit();
      break;
    case 'set_app_icon':
      window.setIcon(nativeImage.createFromBuffer(Buffer.from(args.png)));
      return invokeBackend(command, args, options);
    default:
      return invokeBackend(command, args, options);
  }
  return {};
}

async function localAsset(root, index, url) {
  const address = new URL(url);
  if (address.host !== 'app') {
    return new Response(null, { status: 404 });
  }
  if (address.pathname === '/_chromium-bootstrap.js') {
    return net.fetch(new URL('./renderer.js', import.meta.url).href);
  }
  if (!extname(address.pathname) || address.pathname === '/index.html') {
    return new Response(index, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
  try {
    const file = await realpath(
      resolve(root, `.${decodeURIComponent(address.pathname)}`),
    );
    const path = relative(root, file);
    if (path === '..' || path.startsWith(`..${sep}`) || isAbsolute(path)) {
      return new Response(null, { status: 403 });
    }
    return net.fetch(pathToFileURL(file).href);
  } catch {
    return new Response(null, { status: 404 });
  }
}

async function readSettings() {
  try {
    return JSON.parse(
      await readFile(join(dataDirectory, 'settings.json'), 'utf8'),
    );
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

function readPreferences() {
  const storage = join(
    dataDirectory,
    'localstorage',
    'tauri_localhost_0.localstorage',
  );
  try {
    const database = new DatabaseSync(storage, { readOnly: true });
    try {
      const pairs = database
        .prepare('SELECT key,value FROM ItemTable WHERE key IN (?,?)')
        .all('nuclear-layout-store', 'nuclear-playlist-preferences');
      return pairs.map(({ key, value }) => [
        key,
        Buffer.from(value).toString('utf16le'),
      ]);
    } finally {
      database.close();
    }
  } catch {
    return [];
  }
}

async function start() {
  const root = await realpath(join(player, 'dist'));
  const appHtml = await readFile(join(root, 'index.html'), 'utf8');
  const index = appHtml.replace(
    '<head>',
    '<head><script src="/_chromium-bootstrap.js"></script>',
  );
  const settings = await readSettings();
  preferences = readPreferences();
  protocol.handle(scheme, (request) => localAsset(root, index, request.url));
  session.defaultSession.setPermissionRequestHandler(
    (_contents, _permission, callback) => callback(false),
  );
  await startBackend();
  const frame =
    !settings['core.appearance.customTitleBar'] &&
    !settings['core.appearance.framelessWindow'];
  window = new BrowserWindow({
    title: 'Nuclear Music Player',
    width: 1280,
    height: 720,
    backgroundColor:
      settings['core.theme.dark'] === false ? '#efeff1' : '#212121',
    icon: join(player, 'src-tauri/icons/icon.png'),
    frame,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      sandbox: true,
      nodeIntegration: false,
      contextIsolation: true,
      preload: fileURLToPath(new URL('./preload.cjs', import.meta.url)),
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!allowedPage(url)) {
      event.preventDefault();
    }
  });
  ipcMain.handle('nuclear:invoke', invoke);
  ipcMain.on('nuclear:preferences', (event) => {
    event.returnValue = validSender(event) ? preferences : [];
  });
  await window.loadURL(entry);
  await window.webContents.insertCSS(
    '[data-testid="title-bar"] { -webkit-app-region: drag; } ' +
      '[data-testid="title-bar"] button { -webkit-app-region: no-drag; }',
  );
  const showFallback = setTimeout(() => {
    if (!window.isDestroyed() && !window.isVisible()) {
      window.maximize();
    }
  }, 8000);
  showFallback.unref();
}

app.on('before-quit', shutdown);
app.on('window-all-closed', () => app.quit());
process.once('SIGTERM', () => app.quit());
process.once('SIGINT', () => app.quit());
app
  .whenReady()
  .then(start)
  .catch((error) => {
    if (!stopping) {
      console.error(error.message);
      dialog.showErrorBox('Nuclear', error.message);
    }
    app.quit();
  });
