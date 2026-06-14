from fastapi import FastAPI
from fastapi import File
from fastapi import UploadFile

from ultralytics import YOLO

import shutil
import os
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)



model = YOLO("best.pt")

UPLOAD_FOLDER = "uploads"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.get("/")
def home():

    return {
        "message": "AI Car Damage Detection API Running"
    }



@app.post("/predict")
async def predict(file: UploadFile = File(...)):


    file_path = f"{UPLOAD_FOLDER}/{file.filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Run prediction
    results = model.predict(
        source=file_path,
        conf=0.20,
        save=True
    )

    detections = []

    for result in results:

        for box in result.boxes:

            class_id = int(box.cls[0])

            confidence = float(box.conf[0])

            class_name = model.names[class_id]

            coords = box.xyxy[0].tolist()

            x1, y1, x2, y2 = coords

            # Calculate damage area
            box_area = (x2 - x1) * (y2 - y1)

            # Simple severity estimation
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
        "filename": file.filename,
        "total_damages": len(detections),
        "detections": detections
    }