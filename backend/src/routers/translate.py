import json
from typing import List
from ultralytics import YOLO
from fastapi import APIRouter, Depends , UploadFile, File 
from fastapi.responses import StreamingResponse
from src.panel_translate.manga_translate import ImageClass , ImageBox , manga_boxes_ocr_translate , manga_YOLO_boxes
from src.configurations import settings
from manga_ocr import MangaOcr

router = APIRouter()
mocr = MangaOcr()
YOLO_model_path = settings.BASE_DIR/"src"/"panel_translate"/"comic-speech-bubble-detector.pt"
YOLO_model = YOLO(YOLO_model_path)



async def stream_Images(images , image_srcs ,gemini_api_key: str | None):
    for index , img_bytes in enumerate(images):
        imgobj = manga_YOLO_boxes(
            image_srcs[index],
            img_bytes,
            model=YOLO_model
        )
        res = manga_boxes_ocr_translate(
            imgobj=imgobj,
            mocr=mocr,
            gemini_api_key=gemini_api_key
        )
        imgobj.setTranslatedText(res)

        payload = {
            "index": index,
            "results": imgobj.to_dict()
        }

        yield json.dumps(payload) + "\n"


@router.post("/")
async def image_req(
    images: List[UploadFile] = File(...), image_srcs: List[str] = [] , 
    gemini_api_key: str | None = "api key"
) -> dict:
    if not gemini_api_key:
        return {"error": "Missing api key"}
    
    image_bytes_list = [
        await image.read() for image in images
    ]

    return StreamingResponse(stream_Images(image_bytes_list , image_srcs ,gemini_api_key))
    
