
# AI Vehicle Damage Detection System

An AI-powered vehicle damage detection platform built using YOLOv8, FastAPI, and React.

The system detects vehicle damages from uploaded images, generates inspection summaries, estimates repair costs, and exports PDF inspection reports.

---

## Features

- Vehicle damage detection using YOLOv8
- Bounding box visualization
- Confidence score detection
- Inspection summary generation
- Repair cost estimation
- PDF report export
- Drag and drop image upload
- FastAPI backend API
- React frontend dashboard

---

## Supported Damage Types

- Dent
- Scratch
- Crack
- Glass Shatter
- Lamp Broken
- Tire Flat

---

## Tech Stack

### Frontend
- React
- Vite
- JavaScript
- HTML/CSS

### Backend
- FastAPI
- Python
- Uvicorn

### AI / Computer Vision
- YOLOv8
- Ultralytics
- OpenCV
- PyTorch

---

## Project Structure

```text
vehicle_damage_app/
│
├── backend/
│   ├── main.py
│   ├── best.pt
│   ├── uploads/
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
└── README.md
````

---

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/your-username/vehicle-damage-detection.git
cd vehicle-damage-detection
```

---

### 2. Backend Setup

Move to backend directory:

```bash
cd backend
```

Create virtual environment:

```bash
python -m venv venv
```

Activate virtual environment:

#### Windows

```bash
venv\Scripts\activate
```

#### Mac/Linux

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run FastAPI server:

```bash
uvicorn main:app --reload
```

Backend runs on:

```text
http://127.0.0.1:8000
```

---

### 3. Frontend Setup

Open a new terminal and move to frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Run frontend:

```bash
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

---

## API Endpoint

### POST `/predict`

Upload a vehicle image for damage detection.

### Request Type

```text
multipart/form-data
```

### Sample Response

```json
{
  "detections": [
    {
      "damage_type": "lamp_broken",
      "confidence": 0.65,
      "severity": "Minor"
    }
  ]
}
```

---

## Application Workflow

1. Upload vehicle image
2. AI analyzes vehicle damage
3. Bounding boxes are displayed
4. Inspection summary is generated
5. Repair cost is estimated
6. PDF report is exported

---

## PDF Report Includes

* Uploaded vehicle image
* Detected damages
* Confidence scores
* Severity levels
* Inspection summary
* Repair cost estimation

---

## Deployment

### Frontend Deployment

* Vercel

### Backend Deployment

* Render

---

## Future Improvements

* Real-time webcam detection
* Mobile responsive UI
* User authentication
* Database integration
* Insurance claim integration
* Multi-image inspection
* Cloud storage support

---

## Author

Sarthak Goyal

```

