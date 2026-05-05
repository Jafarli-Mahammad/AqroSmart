from pathlib import Path

from app.celery_app import celery_app
from app.services.plant_analysis import analyze_plant_image


@celery_app.task(name="plant_analysis.process_image")
def process_plant_image_task(image_path: str) -> dict:
    return analyze_plant_image(Path(image_path))
