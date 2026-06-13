from ultralytics import YOLO
from PIL import Image
import gradio as gr

model = YOLO("best.pt")

def detect_damage(image):

    results = model.predict(image)

    plotted = results[0].plot()

    return Image.fromarray(plotted)

interface = gr.Interface(
    fn=detect_damage,
    inputs=gr.Image(type="pil"),
    outputs=gr.Image(type="pil"),
    title="AI Car Damage Detection"
)

interface.launch()