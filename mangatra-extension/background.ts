chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});

async function storeImageResult(tabId: number, src: string, boxes: any) {
  const key = tabId.toString();
  const existing = await chrome.storage.session.get(key);
  const tabCache: any = existing[key] || {};
  tabCache[src] = boxes;
  await chrome.storage.session.set({ [key]: tabCache });
}

async function getCachedImage(tabId: number, src: string) {
  const key = tabId.toString();
  const res: any = await chrome.storage.session.get(key);
  return res[key]?.[src] || null;
}

const imagesTabList = new Map<number, any[]>();

const onMessageCallback = (
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => {
  (async () => {
    if (sender.tab?.id !== undefined) {
      const tabId = sender.tab.id;

      if (
        message?.type === "ADDED_IMAGE_LIST" ||
        message?.type === "UPDATED_IMAGE_LIST"
      ) {
        imagesTabList.set(tabId, message.data);

        chrome.runtime.sendMessage({
          type: "UPDATED_IMAGE_LIST",
          tabId,
          data: message.data,
        });

        sendResponse({ success: true });
        return;
      }
    }

    if (message?.type === "GET_RELOAD_IMAGES") {
      chrome.tabs.sendMessage(
        message.tabId,
        { type: "GET_RELOAD_IMAGES" },
        (imageList: string[]) => {
          imagesTabList.set(message.tabId, imageList || []);

          chrome.runtime.sendMessage({
            type: "UPDATED_IMAGE_LIST",
            tabId: message.tabId,
            data: imageList || [],
          });

          sendResponse(imageList || []);
        }
      );
      return;
    }

    if (message?.type === "GET_CACHED_IMAGES") {
      const cached_boxes = await getCachedImage(
        message.tabId,
        message.src
      );

      sendResponse({
        success: Boolean(cached_boxes),
        cached: cached_boxes ?? null,
      });
      return;
    }

    if (message?.type === "STORE_CACHED_IMAGES") {
      await storeImageResult(
        message.tabId,
        message.data.src,
        message.data.boxes
      );

      sendResponse({ success: true });
      return;
    }
    sendResponse({ success: false });
  })();

  return true;
};

chrome.runtime.onMessage.addListener(onMessageCallback);
chrome.tabs.onRemoved.addListener((tabId) => {
  imagesTabList.delete(tabId);
});