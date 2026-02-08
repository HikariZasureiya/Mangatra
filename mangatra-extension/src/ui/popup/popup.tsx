import { useEffect, useState } from "react";
import TranslateButton from "../../components/TranslateButton";
import DottedButton from "../../components/DottedButton";
import rem from "../../assets/rem.svg";
import StaggeredDropDown from "../../components/Dropdown.tsx"
import { AnimatePresence, motion } from "framer-motion";

interface ProgressBarProps {
  total: number;
  completed: number;
  show: boolean;
}

const ProgressBar = ({ total, completed, show }: ProgressBarProps) => {
  const percentage = total > 0 ? Math.min((completed / total) * 100, 100) : 0;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full px-2"
        >
         
          <div className="mb-1 flex justify-between text-[10px] text-gray-500">
            <span>Translating pages</span>
            <span>
              {completed}/{total}
            </span>
          </div>

         
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
           
            <motion.div
              className="h-full rounded-full bg-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{
                duration: 0.4,
                ease: "easeInOut",
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface ImageComponentProps {
  image: string;
  selected: boolean;
  onToggle: () => void;
}

const ImageComponent = ({ image, selected, onToggle }: ImageComponentProps) => {
  return (
    <div
      className={`relative rounded ${
        selected ? "bg-green-400/55" : "bg-gray-100"
      } p-2 cursor-pointer items-center justify-center flex`}
      onClick={onToggle}
    >
      <div className={`cursor-pointer ${selected ? "scale-90" : ""}`}>
        <img
          src={image}
          className={`w-full h-full object-contain ${
            selected ? "" : "hover:scale-90"
          } transition-transform duration-300 ease-in-out`}
          loading="lazy"
        />
      </div>
    </div>
  );
};

export default function Popup() {
  const [images, setImages] = useState<string[]>([]);
  const [selImages, setSelImages] = useState<Set<string>>(new Set());
  const [totsel, settotsel] = useState<number>(0);
  const [comsel, setcomsel] = useState<number>(0);
  const [isimsend, setisimsend] = useState<boolean>(false);

  const getImageList = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab?.id) return;

      chrome.runtime.sendMessage(
        { type: "GET_RELOAD_IMAGES", tabId: tab.id },
        (response) => {
          setImages(response || []);
        }
      );
    });
  };

  const getImageBlobs = async (images: Set<string>) => {
    const imageList = [...images];

    return await Promise.all(
      imageList.map(async (src) => {
        const response = await fetch(src);
        if (!response.ok) throw new Error("Fetch failed");

        const blob = await response.blob();
        return { src, blob };
      })
    );
  };

  const InjectImages = async (imageObjects: { src: string; boxes: any }) => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab.id)
      chrome.tabs.sendMessage(tab.id, {
        type: "INJECT_IMAGES",
        tabId: tab.id,
        data: imageObjects,
      });
  };

  function sendMessageToTab<T = any>(message: any): Promise<T> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        resolve(response);
      });
    });
  }

  const sendImages = async (imageObjects: { src: string; blob: Blob }[]) => {
    setisimsend(true);
    settotsel(imageObjects.length);
    setcomsel(0);
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) return;

    const formData = new FormData();

    for (const [index, item] of imageObjects.entries()) {
      const response = await sendMessageToTab<{
        success: boolean;
        cached: any;
      }>({
        type: "GET_CACHED_IMAGES",
        tabId: tab.id,
        src: item.src,
      });

      if (response?.success) {
        InjectImages({ src: item.src, boxes: response.cached });
        setcomsel((prev) => prev + 1);
        continue;
      }

      formData.append("images", item.blob, `image_${index}.jpg`);
      formData.append("image_srcs", item.src);
    }

    console.log(imageObjects);
    const response = await fetch("http://localhost:8080/translate", {
      method: "POST",
      body: formData,
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        setisimsend(false);
        getImageList();
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop()!;

      for (const line of lines) {
        if (!line.trim()) continue;
        const data = JSON.parse(line);
        const imageBox = {
          src: data.results.src,
          boxes: data.results.boxes,
        };
        InjectImages(imageBox);
        if (tab.id)
          chrome.runtime.sendMessage({
            type: "STORE_CACHED_IMAGES",
            tabId: tab.id,
            data: imageBox,
          });
        setcomsel((prev) => prev + 1);
      }
    }
  };

  useEffect(() => {
    const onMessage = (message: any) => {
      if (message.type !== "UPDATED_IMAGE_LIST") return;

      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (tab?.id === message.tabId) {
          setImages(message.data || []);
        }
      });
    };

    chrome.runtime.onMessage.addListener(onMessage);
    return () => chrome.runtime.onMessage.removeListener(onMessage);
  }, []);

  return (
    <div className="w-199.75 min-h-149.5 max-h-149.75 bg-linear-to-b from-slate-200 to-white p-3 flex flex-col gap-3">
      <ProgressBar completed={comsel} total={totsel} show={isimsend} />
      <div className="flex items-center justify-between shrink-0">
        <div>
          <img src={rem} className="w-40" alt="rem" />
        </div>

        <div className="space-x-3 flex">
          <div
            className="cursor-pointer active:scale-90"
            onClick={async () => {
              if (!isimsend) {
                const data = await getImageBlobs(selImages);
                await sendImages(data);
              }
            }}
          >
            <TranslateButton TARGET_TEXT="Translate" />
          </div>

          <div
            className="cursor-pointer"
            onClick={() => {
              if (!isimsend) {
                getImageList();
                setSelImages(new Set());
              }
            }}
          >
            <DottedButton />
          </div>
        </div>
      </div>
              <StaggeredDropDown />
      <div className="shrink-0 text-center text-xs text-gray-500">
        Select the manga pages you want to translate
      </div>


      <div className="flex-1 overflow-y-auto flex justify-center border-2 border-dashed border-black rounded-lg">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3 w-[80%] py-3">
          {images.map((src) => (
            <ImageComponent
              key={src}
              image={src}
              selected={selImages.has(src)}
              onToggle={() => {
                if (!isimsend)
                  setSelImages((prev) => {
                    const next = new Set(prev);
                    next.has(src) ? next.delete(src) : next.add(src);
                    return next;
                  });
              }}
            />
          ))}
        </div>
      </div>

      {images.length === 0 && (
        <div className="text-xs text-gray-400 text-center py-2">
          No images detected. Reload.
        </div>
      )}
    </div>
  );
}
