(() => {
  const bridge = window.nuclearChromiumBridge;
  const callbacks = new Map();
  const eventCallbacks = new Map();
  let nextCallbackId = 0;

  for (const [key, value] of bridge.preferences) {
    if (window.localStorage.getItem(key) === null) {
      window.localStorage.setItem(key, value);
    }
  }

  function encode(value) {
    return JSON.parse(
      JSON.stringify(value, (_key, entry) => {
        if (ArrayBuffer.isView(entry)) {
          return {
            __nuclearBytes: Array.from(
              new Uint8Array(entry.buffer, entry.byteOffset, entry.byteLength),
            ),
          };
        }
        if (entry instanceof ArrayBuffer) {
          return { __nuclearBytes: Array.from(new Uint8Array(entry)) };
        }
        if (typeof entry?.__TAURI_TO_IPC_KEY__ === 'function') {
          return entry.__TAURI_TO_IPC_KEY__();
        }
        return entry;
      }),
    );
  }

  async function invoke(command, args = {}, options) {
    const result = await bridge.invoke(
      command,
      encode(args),
      options && encode(options),
    );
    if ('error' in result) {
      throw result.error;
    }
    if (command === 'plugin:event|listen') {
      eventCallbacks.set(result.value, args.handler);
    }
    return result.value;
  }

  bridge.onCallback((id, value) => {
    const callback = callbacks.get(id);
    if (!callback) {
      return;
    }
    if (callback.once) {
      callbacks.delete(id);
    }
    callback.handler(value);
  });

  window.__TAURI_INTERNALS__ = {
    invoke,
    metadata: {
      currentWindow: { label: 'main' },
      currentWebview: { label: 'main' },
    },
    plugins: { path: { sep: '/', delimiter: ':' } },
    transformCallback(handler, once = false) {
      const id = ++nextCallbackId;
      callbacks.set(id, { handler, once });
      return id;
    },
    unregisterCallback(id) {
      callbacks.delete(id);
    },
  };
  window.__TAURI_EVENT_PLUGIN_INTERNALS__ = {
    unregisterListener(_event, id) {
      callbacks.delete(eventCallbacks.get(id));
      eventCallbacks.delete(id);
    },
  };
  window.__TAURI_OS_PLUGIN_INTERNALS__ = {
    platform: 'linux',
    family: 'unix',
    os_type: 'linux',
    arch:
      bridge.architecture === 'x64'
        ? 'x86_64'
        : bridge.architecture === 'arm64'
          ? 'aarch64'
          : bridge.architecture,
    eol: '\n',
    exe_extension: '',
  };
  window.isTauri = true;
})();
