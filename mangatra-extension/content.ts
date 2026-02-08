import { wrap } from "module";

let imageSrcList: string[] = [];

function getImageSrc(img: HTMLImageElement): string | null {
  return (
    img.currentSrc ||
    img.src ||
    img.getAttribute("data-src") ||
    img.getAttribute("data-original") ||
    img.getAttribute("data-lazy-src")
  );
}

const AllImageFunction = () => {
  const images = document.querySelectorAll("img");
  images.forEach((element) => {
    const imgsrc = getImageSrc(element);
    if (imgsrc) imageSrcList.push(imgsrc);
  });

  chrome.runtime.sendMessage({
    type: "ADDED_IMAGE_LIST",
    data: imageSrcList,
  });
};

const injectOverlayCSS = () => {
  if (document.getElementById("img-overlay-style")) return;

  const style = document.createElement("style");
  style.id = "img-overlay-style";
  style.textContent = `
    .img-overlay-wrapper {
      position: relative;
      display: inline-block;
    }

    .img-box {
      position: absolute;
      border: 2px solid black;
      pointer-events: none;
      box-sizing: border-box;
    }
  `;

  document.head.appendChild(style);
};

const clearBoxButton = (pardiv : HTMLElement)=>{
    const div = document.createElement("div");
    div.className = "mangatra-clear-box";
    div.innerText = "clear";
    div.style.position = "absolute";
    div.style.zIndex = "9999";
    div.style.font = "underline";
    div.style.left = `0px`;
    div.style.top = `0px`;
    div.style.cursor = "pointer";
    div.style.color ="white"
    div.style.backgroundColor="blue"
    div.style.border="black 1px solid"

    div.addEventListener("click", (e) => {
        e.stopPropagation();
        const boxele = pardiv.querySelectorAll("#mangatra-box-id-gay-ninja");
        boxele.forEach((item)=>{
            item.remove();
        })
        div.remove()
    });

    return div;
}

const createBoxDiv = (box: any, img: HTMLImageElement) => {
  const w = box.w_n * img.clientWidth;
  const h = box.h_n * img.clientHeight;

  const left = box.cx_n * img.clientWidth - w / 2;
  const top = box.cy_n * img.clientHeight - h / 2;

  const div = document.createElement("div");
  div.className = "img-box";
  div.id = "mangatra-box-id-gay-ninja";
  div.style.position = "absolute";
  div.style.left = `${left}px`;
  div.style.top = `${top}px`;
  div.style.width = `${w}px`;
  div.style.height = `${h}px`;
  div.style.backgroundColor = "white";
  div.innerHTML = `
  <div class="close-btn" style="
      position: absolute;
      top: 2px;
      right: 4px;
      cursor: pointer;
      font-weight: bold;
      color: red;
      background: white;
      padding: 0 4px;
      border-radius: 3px;
      z-index: 11;
  ">✕</div>

  <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      pointer-events: auto;
  ">
      <h3 style="
          margin: 0;
          font-size: 14px;
          color: black;
          background: rgba(255, 255, 255, 0.8);
          padding: 4px 6px;
          border-radius: 4px;
          cursor: pointer;
      ">
          ${box.text}
      </h3>
  </div>
`;
  div.style.pointerEvents = "auto";
  div.style.zIndex = "9998";
  const closeBtn = div.querySelector(".close-btn");
  closeBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    div.remove();
  });

  return div;
};

const getOrCreateWrapper = (img: HTMLImageElement): HTMLDivElement => {
  if (img.parentElement?.classList.contains("img-overlay-wrapper")) {
    return img.parentElement as HTMLDivElement;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "img-overlay-wrapper";
  wrapper.style.position = "relative";
  wrapper.style.display = "inline-block";

  const parent = img.parentNode;
  if (!parent) return wrapper;

  parent.replaceChild(wrapper, img);
  wrapper.appendChild(img);

  return wrapper;
};

const inject_images_div = (data: { src: string; boxes: any[] }) => {
  const images = document.querySelectorAll<HTMLImageElement>("img");

  images.forEach((img) => {
    const imgsrc = getImageSrc(img);
    if (!imgsrc || imgsrc !== data.src) return;

    const inject = () => {
      const wrapper = getOrCreateWrapper(img);
      wrapper.querySelectorAll(".img-box").forEach((el) => el.remove());
      const clearbutton = clearBoxButton(wrapper);
      wrapper.appendChild(clearbutton);
      data.boxes.forEach((box) => {
        wrapper.appendChild(createBoxDiv(box, img));
      });
    };
    if (!img.complete || img.clientWidth === 0) {
      img.addEventListener("load", inject, { once: true });
    } else {
      inject();
    }
  });
};





function logNewImages(records: MutationRecord[]) {
  const removedSrcs = new Set<string>();
  const addedSrcs = new Set<string>();

  for (const record of records) {
    if (record.type !== "childList") continue;

    record.removedNodes.forEach((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as Element;

      if (el.tagName === "IMG") {
        const src = getImageSrc(el as HTMLImageElement);
        if (src) removedSrcs.add(src);
      }

      el.querySelectorAll("img").forEach((img) => {
        const src = getImageSrc(img);
        if (src) removedSrcs.add(src);
      });
    });

    record.addedNodes.forEach((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as Element;
      if (el.tagName === "IMG") {
        const src = getImageSrc(el as HTMLImageElement);
        if (src) addedSrcs.add(src);
      }
      el.querySelectorAll("img").forEach((img) => {
        const src = getImageSrc(img);
        if (src) addedSrcs.add(src);
      });
    });
  }

  const currentSet = new Set(imageSrcList);
  removedSrcs.forEach((src) => currentSet.delete(src));
  addedSrcs.forEach((src) => currentSet.add(src));
  imageSrcList = [...currentSet];

  chrome.runtime.sendMessage({
    type: "UPDATED_IMAGE_LIST",
    data: imageSrcList,
  });
}

const observerOptions = {
  childList: true,
  subtree: true,
};

const observer = new MutationObserver(logNewImages);

chrome.runtime.sendMessage({ type: "PAGE_LOADED" });
observer.observe(document.body, observerOptions);

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message?.type === "GET_RELOAD_IMAGES") {
    const images = document.querySelectorAll("img");
    const imageList: string[] = [];

    images.forEach((img) => {
      const src = getImageSrc(img as HTMLImageElement);
      if (src) imageList.push(src);
    });
    sendResponse(imageList);
  } else if (message?.type === "INJECT_IMAGES") {
    const data = message.data;
    inject_images_div(data);
  }
  
  return true;
});

AllImageFunction();
injectOverlayCSS();
