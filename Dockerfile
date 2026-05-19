FROM python:3.10-slim

WORKDIR /app

# git is required by DVC
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

RUN pip install -e .

# Pull only the two files needed for inference (skip the 66 MB dataset)
ARG DAGSHUB_USER=navneetsxngh
ARG DAGSHUB_TOKEN
RUN git init && \
    dvc remote modify origin --local user ${DAGSHUB_USER} && \
    dvc remote modify origin --local password ${DAGSHUB_TOKEN} && \
    dvc pull artifacts/data_transformation/tokenizer.pkl && \
    dvc pull artifacts/model_trainer/model.h5

EXPOSE 8080

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
