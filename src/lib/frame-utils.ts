export function createTriggerIframeReady(
  getIframe: () => HTMLIFrameElement | null,
  options: {
    retryDelay?: number;
    maxRetries?: number;
    onError?: (error: Error) => void;
  } = {},
): () => void {
  const { retryDelay = 100, maxRetries = Infinity, onError } = options;
  let retryCount = 0;

  const triggerIframeReady = (): void => {
    try {
      const iframe = getIframe();
      if (!iframe?.contentWindow) {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(triggerIframeReady, retryDelay);
        } else if (onError) {
          onError(new Error("Iframe not available after max retries"));
        }
        return;
      }
      const iframeDoc = iframe.contentDocument ?? iframe.contentWindow.document;
      if (iframeDoc?.readyState === "complete") {
        iframe.contentWindow.postMessage({ type: "REQUEST_READY" }, "*");
        retryCount = 0;
      } else if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(triggerIframeReady, retryDelay);
      } else if (onError) {
        onError(new Error("Iframe document not ready after max retries"));
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  };
  return triggerIframeReady;
}
