let unauthorizedHandler: (() => void) | undefined;

export function registerUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = undefined;
  };
}

export function handleUnauthorizedResponse() {
  unauthorizedHandler?.();
}
