FROM python:3.13-slim
WORKDIR /app
COPY cgm-publisher/app.py ./app.py
COPY data/sample/ ./data/
ENV FIXTURE_PATHS=/app/data/demo_patient_001.json,/app/data/demo_patient_002.json
CMD ["python", "-u", "app.py"]
