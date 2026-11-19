(() => {
  const host = window.__TAURI_INTERNALS__;
  if (!host) {
    return;
  }

  const message = 'chromium_host_message';
  const channels = new Map();
  const eventCallbacks = new Map();

  const send = (payload) => host.invoke(message, { message: payload });

  const register = (id) => {
    if (channels.has(id)) {
      return channels.get(id);
    }
    const callback = host.transformCallback((value) => {
      if (value?.end === true) {
        channels.delete(id);
        host.unregisterCallback(callback);
      }
      void send({ callback: id, value });
    });
    channels.set(id, callback);
    return callback;
  };

  const unregister = (id) => {
    const callback = channels.get(id);
    if (callback !== undefined) {
      host.unregisterCallback(callback);
    }
    channels.delete(id);
  };

  const transform = (value) => {
    if (Array.isArray(value)) {
      return value.map(transform);
    }
    if (typeof value === 'string' && /^__CHANNEL__:\d+$/.test(value)) {
      return `__CHANNEL__:${register(Number(value.slice('__CHANNEL__:'.length)))}`;
    }
    if (value && typeof value === 'object') {
      if (Array.isArray(value.__nuclearBytes)) {
        return Uint8Array.from(value.__nuclearBytes);
      }
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, transform(item)]),
      );
    }
    return value;
  };

  window.nuclearChromiumDispatch = async ({ id, command, args, options }) => {
    try {
      if (command === message) {
        throw new Error('Reserved host command');
      }
      const input = transform(args);
      if (command === 'plugin:event|listen') {
        input.handler = register(args.handler);
      }
      if (command === 'plugin:event|unlisten') {
        window.__TAURI_EVENT_PLUGIN_INTERNALS__.unregisterListener(
          args.event,
          args.eventId,
        );
      }
      if (
        command.endsWith('|remove_listener') &&
        channels.has(args.channelId)
      ) {
        input.channelId = channels.get(args.channelId);
      }
      let value = await host.invoke(command, input, options);
      if (command === 'plugin:event|listen') {
        eventCallbacks.set(value, args.handler);
      }
      if (command === 'plugin:event|unlisten') {
        unregister(eventCallbacks.get(args.eventId));
        eventCallbacks.delete(args.eventId);
      }
      if (command.endsWith('|remove_listener')) {
        unregister(args.channelId);
      }
      if (value instanceof ArrayBuffer) {
        value = Array.from(new Uint8Array(value));
      }
      await send({ id, value });
    } catch (error) {
      await send({
        id,
        error:
          error instanceof Error
            ? error.message
            : (error ?? 'Host command failed'),
      });
    }
  };

  void send({ ready: true });
})();
