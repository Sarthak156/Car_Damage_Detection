---
title: Vehicle Damage Detection API
emoji: 🚗
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
---

# Vehicle Damage Detection API

Pure FastAPI deployment for Hugging Face Spaces.

## Endpoints

- `GET /` returns a health message.
- `POST /predict` accepts a form-data file upload named `file`.

## Included files

- `app.py` FastAPI application
- `best.pt` YOLO model weights
- `requirements.txt` Python dependencies
- `Dockerfile` Space container build
- `.gitattributes` Git LFS rules for the model file

## Upload notes

This bundle is meant for a Docker Space. The `Dockerfile` installs the native OpenCV libraries and starts Uvicorn on port `7860`.