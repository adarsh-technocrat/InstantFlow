// Bridge between the bottom input box and the ChatPanel's useChat hook.
// ChatPanel registers its sendMessage, EditingModeDisplay calls it.

let _sendFn: ((text: string) => void) | null = null;

export function registerChatSend(fn: (text: string) => void) {
  _sendFn = fn;
}

export function unregisterChatSend() {
  _sendFn = null;
}

export function sendChatMessage(text: string) {
  if (_sendFn) {
    _sendFn(text);
  }
}
