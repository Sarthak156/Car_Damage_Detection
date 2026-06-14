from ultralytics import YOLO
import gradio as gr
import traceback
import numpy as np
from PIL import Image

# Load model — best.pt must be in the same directory as app.py
model = YOLO("best.pt")

def detect_damage(image):
    """
    image: numpy array (H, W, 3) — Gradio passes this when type="numpy"
    """
    if image is None:
        return {
            "total_damages": 0,
            "detections": [],
            "error": "No image was received by the backend."
        }

    try:
        pil_image = Image.fromarray(image.astype(np.uint8))
        results   = model.predict(pil_image, conf=0.20)
        detections = []

        for result in results:
            for box in result.boxes:
                class_id   = int(box.cls[0])
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
                    "confidence":  round(confidence, 2),
                    "severity":    severity,
                    "bounding_box": {
                        "x1": round(x1, 2),
                        "y1": round(y1, 2),
                        "x2": round(x2, 2),
                        "y2": round(y2, 2)
                    }
                })

        return {
            "total_damages": len(detections),
            "detections":    detections
        }

    except Exception as e:
        return {
            "total_damages": 0,
            "detections":    [],
            "error": f"Python Error: {str(e)}\n\nTraceback:\n{traceback.format_exc()}"
        }


interface = gr.Interface(
    fn=detect_damage,
    inputs=gr.Image(type="numpy", label="Upload Car Image"),
    outputs=gr.JSON(label="Detection Results"),
    title="AI Car Damage Detection",
    description="Upload a car image to detect damage using YOLO",
    flagging_mode="never",   # ✅ replaces allow_flagging="never" (Gradio 5+)
    api_name="predict"
)

if __name__ == "__main__":
    interface.launch(server_name="0.0.0.0", server_port=7860)