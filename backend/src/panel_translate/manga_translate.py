from ultralytics import YOLO
import json
import numpy as np
from numpy.typing import NDArray
import cv2
from google import genai
import PIL.Image
from manga_ocr import MangaOcr
import io

def extract_text_manga_ocr(img_pil , mocr):   
    text = mocr(img_pil)
    return text
    

class ImageBox:
    def __init__(self , cx_n: float , cy_n: float , w_n: float , h_n: float , confidence: float , class_id: int ):
        self.cx_n: float = cx_n
        self.cy_n: float = cy_n
        self.w_n: float = w_n
        self.h_n: float = h_n
        self.confidence: float = confidence
        self.class_id: int = class_id
        self.orig_text: str = ""
        self.text: str=""
    
    def setText(self , text: str):
        self.text: str = text
    
    def setOrigText(self , orig_text: str):
        self.orig_text: str = orig_text
    
    def getText(self) -> str:
        return self.text
    
    def getOrigText(self) -> str:
        return self.orig_text
    
    def to_dict(self) -> dict:
        return {
            "cx_n": self.cx_n,
            "cy_n": self.cy_n,
            "w_n": self.w_n,
            "h_n": self.h_n,
            "confidence": self.confidence,
            "class_id": self.class_id,
            "text": self.text,
            "orig_text": self.orig_text
        }
    
    def to_json(self) -> str:
        json_val = {"cx_n":self.cx_n , 
                    "cy_n": self.cy_n , 
                    "w_n": self.w_n , 
                    "h_n": self.h_n ,
                    "confidence": self.confidence , 
                    "class_id": self.class_id,
                    "text": self.text,
                    "orig_text": self.orig_text
        }
        return json.dumps(json_val)
    
class ImageClass:
    def __init__(self , width: float , height: float , original_image: NDArray , src: str):
        self.width: float = width
        self.height: float = height
        self.boxes: list[ImageBox] = []
        self.original_image: NDArray = original_image
        self.src = src

    def setBoxes(self , boxes: list[ImageBox]) -> None:
        self.boxes = boxes
    
    def to_dict(self) -> str:
        box_list: list[dict] = []
        if self.boxes !=[]:
            for box in self.boxes:
                box_list.append(box.to_dict())
        res_body = {"width": self.width , "height": self.height , "src": self.src ,  "boxes": box_list}
        return res_body

    def setTranslatedText(self , jsonstr : str)-> None:
        jsonstr = jsonstr.strip("`json")
        jsonlist = json.loads(jsonstr)   
        for item in jsonlist:
            self.boxes[item['id']].setText(item['text'])

def normalized_to_pixel_box(box: ImageBox, img_w: float, img_h: float) -> tuple[float]:
    cx = box.cx_n * img_w
    cy = box.cy_n * img_h
    w  = box.w_n  * img_w
    h  = box.h_n  * img_h

    x1 = int(cx - w / 2)
    y1 = int(cy - h / 2)
    x2 = int(cx + w / 2)
    y2 = int(cy + h / 2)

    return x1, y1, x2, y2

def clamp_box(x1: float , y1: float , x2: float , y2: float , img_w: float , img_h: float) -> tuple[float]:
    x1 = max(0, min(x1, img_w))
    y1 = max(0, min(y1, img_h))
    x2 = max(0, min(x2, img_w))
    y2 = max(0, min(y2, img_h))
    return x1, y1, x2, y2


def manga_YOLO_boxes(src , img_bytes , model) -> ImageClass:
    np_arr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Invalid image bytes")
    results = model.predict(img, save=False, conf=0.7 , verbose=False)
    result = results[0]
    imgobj = ImageClass(result.orig_shape[1] , result.orig_shape[0] , result.orig_img , src)
    box_list = []
    for box in result.boxes:
        cx, cy, w, h = box.xywhn[0].tolist()
        conf = float(box.conf[0].item())
        cls  = int(box.cls[0].item())
        box_list.append(
            ImageBox(cx, cy, w, h, conf, cls)
        )
        
    imgobj.setBoxes(box_list)
    return imgobj

def manga_boxes_ocr_translate(imgobj: ImageClass , mocr: MangaOcr, gemini_api_key ,language="en") -> str:
    query = {
        "task": "translate manga page",
        "source_language": "ja",
        "target_language": language,
        "instructions": [
            "Translate manga dialogue naturally",
            "Preserve tone, intent, and meaning",
            "Do not merge or split lines",
            "Do not add explanations or commentary",
            "Preserve punctuation where possible",
            "Return output strictly as a JSON array and make sure it doesn't have any trailing text",
            "Each array item must contain only: id, text",
            "IDs must match the input IDs exactly",
        ],
        "reading_order": []
    }

    req_query = []
    for index , box in enumerate(imgobj.boxes):
        x1,y1,x2,y2 = normalized_to_pixel_box(box , imgobj.width , imgobj.height)
        x1,y1,x2,y2 = clamp_box(x1 , y1 , x2 , y2 , imgobj.width , imgobj.height)
        cropped = imgobj.original_image[y1:y2 , x1:x2]
        if cropped.size == 0:
            continue
        try:
            _ , buffer = cv2.imencode(".png" , cropped)
            img_bytes = buffer.tobytes()
            img_pil = PIL.Image.open(io.BytesIO(img_bytes))
            res = extract_text_manga_ocr(img_pil=img_pil , mocr=mocr)
            box.setOrigText(orig_text = res)
            req_query.append({"id": index , "text": res})

        except Exception as e:
            print(e)
            req_query.append({"id": index , "text": ""})

    query["reading_order"] = req_query
    request_query = json.dumps(query)

    client = genai.Client(api_key=gemini_api_key)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=request_query
    )
    return response.text