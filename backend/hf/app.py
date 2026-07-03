import os
import shutil
import traceback
from pathlib import Path

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from ultralytics import YOLO

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = os.getenv("MODEL_PATH")
UPLOAD_FOLDER = BASE_DIR / "uploads"


def resolve_model_path() -> Path:
    candidate_paths = []

    if MODEL_PATH:
        candidate_paths.append(Path(MODEL_PATH))

    candidate_paths.extend([
        BASE_DIR / "best.pt",
        BASE_DIR.parent / "best.pt",
        BASE_DIR.parent.parent / "best.pt",
    ])

    for candidate_path in candidate_paths:
        if candidate_path.exists():
            return candidate_path

    searched_paths = "\n".join(str(path) for path in candidate_paths)
    raise FileNotFoundError(
        "Could not find best.pt. Set MODEL_PATH or place the model in one of these locations:\n"
        f"{searched_paths}"
    )


model = YOLO(str(resolve_model_path()))
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)


@app.get("/")
def home():
    return {
        "message": "AI Car Damage Detection API Running"
    }


def detect_damage(image: Image.Image):
    try:
        results = model.predict(image.convert("RGB"), conf=0.20)
        detections = []

        for result in results:
            for box in result.boxes:
                class_id = int(box.cls[0])
                confidence = float(box.conf[0])
                class_name = model.names[class_id]
                x1, y1, x2, y2 = box.xyxy[0].tolist()

                box_area = (x2 - x1) * (y2 - y1)
                if box_area < 10000:
                    severity = "Minor"
                elif box_area < 40000:
                    severity = "Moderate"
                else:
                    severity = "Severe"

                detections.append({
                    "damage_type": class_name,
                    "confidence": round(confidence, 2),
                    "severity": severity,
                    "bounding_box": {
                        "x1": round(x1, 2),
                        "y1": round(y1, 2),
                        "x2": round(x2, 2),
                        "y2": round(y2, 2)
                    }
                })

        return {
            "total_damages": len(detections),
            "detections": detections
        }

    except Exception as e:
        return {
            "total_damages": 0,
            "detections": [],
            "error": f"Python Error: {str(e)}\n\nTraceback:\n{traceback.format_exc()}"
        }


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    file_path = UPLOAD_FOLDER / file.filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    with Image.open(file_path) as image:
        result = detect_damage(image)

    return {
        "filename": file.filename,
        **result,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "7860")))