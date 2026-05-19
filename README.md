# IMDB Sentiment Analysis

A production-ready deep learning pipeline that classifies IMDB movie reviews as **Positive** or **Negative** using a Bidirectional LSTM (Bi-LSTM) model. The project includes a full ML pipeline (data ingestion → transformation → training → evaluation) managed with **DVC**, and a FastAPI REST API for inference.

---

## Model Performance

| Metric    | Score  |
|-----------|--------|
| Accuracy  | 86.93% |
| Precision | 85.93% |
| Recall    | 88.32% |
| F1 Score  | 87.11% |

---

## Project Structure

```
IMDB Project/
├── app.py                        # FastAPI REST API (single & batch prediction)
├── main.py                       # Pipeline orchestration entry point
├── dvc.yaml                      # DVC pipeline definition
├── params.yaml                   # Model hyperparameters (tracked by DVC)
├── config/
│   └── config.yaml               # File paths and artifact directories
├── src/
│   ├── stages/                   # DVC stage runner scripts
│   │   ├── stage_01_data_ingestion.py
│   │   ├── stage_02_data_transformation.py
│   │   ├── stage_03_model_trainer.py
│   │   └── stage_04_model_evaluation.py
│   └── IMDBSentimentAnalysis/
│       ├── components/           # Core ML logic
│       │   ├── dataingestion.py
│       │   ├── datatransformation.py
│       │   ├── ModelTrainer.py
│       │   ├── ModelEvaluation.py
│       │   └── prediction.py
│       ├── config/
│       │   └── configuration.py  # Config manager (reads config.yaml + params.yaml)
│       ├── constants/            # Path constants
│       ├── entity/
│       │   └── config_entity.py  # Typed dataclass configs
│       ├── logging/              # Custom logger setup
│       ├── pipeline/             # Stage pipeline wrappers
│       │   ├── dataingestionpipeline.py
│       │   ├── datatransformationpipeline.py
│       │   ├── modeltrainerpipeline.py
│       │   ├── modelevaluationpipeline.py
│       │   └── predictionpipeline.py
│       └── utils/
│           └── main.py           # Shared utility functions
├── Dockerfile                    # Docker containerization
├── requirements.txt              # Python dependencies
├── .dvcignore                    # DVC ignore patterns
└── artifacts/                    # Auto-generated outputs (tracked by DVC)
    ├── data_ingestion/           # Raw CSV
    ├── data_transformation/      # tokenizer.pkl, train.npz, test.npz
    ├── model_trainer/            # model.h5, history.pkl
    └── model_evaluation/         # report.json, confusion_matrix.png, accuracy_plot.png, loss_plot.png
```

---

## Model Architecture

The model is a stacked Bidirectional LSTM built with TensorFlow/Keras:

```
Embedding(10000 vocab, 128 dim, input_len=200)
    → SpatialDropout1D(0.5)
    → Bidirectional(LSTM(64, return_sequences=True, dropout=0.5, recurrent_dropout=0.2))
    → Bidirectional(LSTM(32, dropout=0.5, recurrent_dropout=0.2))
    → Dense(64, activation='relu')
    → Dropout(0.5)
    → Dense(1, activation='sigmoid')
```

**Hyperparameters** (`params.yaml`):

| Parameter     | Value  |
|---------------|--------|
| max_words     | 10000  |
| max_len       | 200    |
| embedding_dim | 128    |
| lstm_units    | 64     |
| dropout_rate  | 0.5    |
| batch_size    | 64     |
| epochs        | 10     |
| learning_rate | 0.001  |
| test_size     | 0.2    |

**Training callbacks**: EarlyStopping (patience=3), ModelCheckpoint (best val_accuracy), ReduceLROnPlateau (factor=0.2, patience=2).

---

## Setup

### Prerequisites

- Python 3.8+
- Git
- A [Kaggle](https://www.kaggle.com) account and API key

### 1. Clone the repository

```bash
git clone <repo-url>
cd "IMDB Projetc"
```

### 2. Create and activate a virtual environment

```bash
python -m venv IMDBenv

# Windows
IMDBenv\Scripts\activate

# macOS/Linux
source IMDBenv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Kaggle credentials

Create a `.env` file in the project root:

```env
KAGGLE_USERNAME=your_kaggle_username
KAGGLE_KEY=your_kaggle_api_key
```

Your Kaggle API key can be found at `https://www.kaggle.com/settings` → **API** → **Create New Token**.

---

## DVC — Data Version Control

This project uses [DVC](https://dvc.org) to version data, track experiments, and reproduce the full ML pipeline with a single command.

### DVC Pipeline Overview

```
data_ingestion
      │
      ▼
data_transformation  ◄── params.yaml (max_words, max_len, test_size, random_state)
      │
      ▼
model_trainer        ◄── params.yaml (batch_size, epochs, embedding_dim, lstm_units, dropout_rate, learning_rate)
      │
      ▼
model_evaluation     ──► artifacts/model_evaluation/report.json  (metrics)
                     ──► confusion_matrix.png, accuracy_plot.png, loss_plot.png
```

---

### Initialising DVC (first-time setup)

```bash
# Initialise git (required — DVC piggybacks on git)
git init

# Initialise DVC
dvc init

# Stage the DVC config files
git add .dvc .dvcignore dvc.yaml params.yaml
git commit -m "initialise DVC"
```

---

### Configuring a DVC Remote (optional but recommended)

A remote lets you push/pull large files (datasets, models) to cloud storage so teammates don't need to re-run expensive stages.

```bash
# ── Local folder remote (quick start) ──────────────────────────
dvc remote add -d localremote /tmp/dvc-storage

# ── AWS S3 ─────────────────────────────────────────────────────
dvc remote add -d myremote s3://your-bucket/dvc-store
dvc remote modify myremote region us-east-1

# ── Google Drive ────────────────────────────────────────────────
dvc remote add -d myremote gdrive://your-folder-id

# ── Azure Blob Storage ──────────────────────────────────────────
dvc remote add -d myremote azure://your-container/dvc-store

# Commit the remote config
git add .dvc/config
git commit -m "configure DVC remote"
```

---

### Running the Full Pipeline

```bash
# Run all stages (skips stages whose deps/params haven't changed)
dvc repro

# Force re-run every stage even if nothing changed
dvc repro --force

# Run only a specific stage
dvc repro data_ingestion
dvc repro data_transformation
dvc repro model_trainer
dvc repro model_evaluation

# Dry-run — show what would be executed without running
dvc repro --dry
```

---

### Running Individual Stages Manually

You can also run each stage directly as a Python script (without DVC):

```bash
python src/stages/stage_01_data_ingestion.py
python src/stages/stage_02_data_transformation.py
python src/stages/stage_03_model_trainer.py
python src/stages/stage_04_model_evaluation.py
```

---

### Checking Pipeline Status

```bash
# Show which stages are outdated or have changed deps
dvc status

# Show the pipeline as a DAG in the terminal
dvc dag

# Show the DAG with all file dependencies
dvc dag --dot | dot -Tpng -o pipeline.png
```

---

### Viewing Metrics

```bash
# Show current metrics from report.json
dvc metrics show

# Compare metrics between git commits / branches
dvc metrics diff

# Compare metrics between two specific commits
dvc metrics diff HEAD~1 HEAD
```

Example output:

```
Path                                    Metric      HEAD~1    HEAD    Change
artifacts/model_evaluation/report.json  accuracy    0.8671    0.8693  0.0022
artifacts/model_evaluation/report.json  f1_score    0.8691    0.8711  0.0020
artifacts/model_evaluation/report.json  precision   0.8571    0.8593  0.0022
artifacts/model_evaluation/report.json  recall      0.8812    0.8832  0.0020
```

---

### Tracking Hyperparameter Changes

```bash
# Show current params from params.yaml
dvc params show

# Compare params between commits
dvc params diff

# Compare params between two specific commits
dvc params diff HEAD~1 HEAD
```

---

### Experiment Tracking

```bash
# Run an experiment (saves results in DVC experiment log)
dvc exp run

# Run with overridden params (no need to edit params.yaml)
dvc exp run --set-param epochs=15
dvc exp run --set-param batch_size=32 --set-param learning_rate=0.0005

# List all saved experiments
dvc exp show

# Compare experiments in a table
dvc exp show --md

# Apply the best experiment to your workspace
dvc exp apply <exp-name>

# Remove an experiment
dvc exp remove <exp-name>
```

---

### Pushing and Pulling Artifacts

```bash
# Push all tracked artifacts to the remote
dvc push

# Pull artifacts from the remote (e.g., after cloning)
dvc pull

# Push only a specific file
dvc push artifacts/model_trainer/model.h5

# Pull only a specific file
dvc pull artifacts/model_trainer/model.h5

# Fetch without checking out (downloads to cache only)
dvc fetch
```

---

### Adding Files to DVC Tracking (outside the pipeline)

```bash
# Track a data file manually
dvc add artifacts/data_ingestion/"IMDB Dataset.csv"

# This creates a .dvc file — commit it to git
git add "artifacts/data_ingestion/IMDB Dataset.csv.dvc" .gitignore
git commit -m "track dataset with DVC"
```

---

### Useful Day-to-Day Commands

```bash
# Check what DVC is tracking
dvc list . --dvc-only

# Check cache usage
dvc cache dir

# Garbage-collect unreferenced cache entries
dvc gc -w               # keep only files referenced in current workspace
dvc gc -a               # keep files from all commits
dvc gc -T               # keep files from all tags
dvc gc --cloud          # also clean the remote

# Check if pipeline is up to date
dvc status --cloud

# Get data from another DVC repo without cloning it
dvc get <repo-url> artifacts/model_trainer/model.h5

# Import a file and track its source (stays linked)
dvc import <repo-url> artifacts/model_trainer/model.h5

# Update an imported file
dvc update model.h5.dvc
```

---

### Typical Experiment Workflow

```bash
# 1. Edit params.yaml — e.g., change epochs from 10 → 15
# 2. Reproduce the pipeline (only affected stages re-run)
dvc repro

# 3. Compare metrics to previous run
dvc metrics diff

# 4. If improved, commit everything
git add dvc.lock params.yaml
git commit -m "experiment: epochs=15, improved F1 by 0.002"
dvc push

# 5. Or use dvc exp run for lightweight experiment tracking
dvc exp run --set-param epochs=15 --name "exp-epochs-15"
dvc exp show
```

---

## MLflow — Experiment Tracking

This project uses [MLflow](https://mlflow.org) to track every training run: hyperparameters, per-epoch metrics, final evaluation scores, and artifact plots. MLflow runs automatically when you execute `dvc repro` or run any stage script directly.

### What Gets Tracked

| Stage | Params | Metrics | Artifacts |
|-------|--------|---------|-----------|
| `model_training` | all `params.yaml` values + dataset sizes | `train_loss`, `train_accuracy`, `val_loss`, `val_accuracy` per epoch · `final_test_loss`, `final_test_accuracy` | `model.h5`, `history.pkl` |
| `model_evaluation` | — | `accuracy`, `precision`, `recall`, `f1_score` | `report.json`, `confusion_matrix.png`, `accuracy_plot.png`, `loss_plot.png` |

---

### Setup

MLflow is configured via `.env`. The default stores runs locally in `./mlruns` (no server needed):

```env
MLFLOW_TRACKING_URI=mlruns
MLFLOW_EXPERIMENT_NAME=IMDB_Sentiment_Analysis
```

For a self-hosted server or DagsHub remote, edit the `MLFLOW_TRACKING_URI` line in `.env` (see comments inside the file).

---

### Install

```bash
pip install mlflow
# or install from requirements.txt (mlflow is already included)
pip install -r requirements.txt
```

---

### Starting the MLflow UI

```bash
# Launch the tracking UI (reads from the local ./mlruns directory)
mlflow ui

# Specify a custom port
mlflow ui --port 5001

# Point to a specific tracking store
mlflow ui --backend-store-uri sqlite:///mlflow.db
```

Open `http://localhost:5000` in your browser to see all experiments and runs.

---

### Running Experiments

```bash
# Run the full DVC pipeline — MLflow tracking happens automatically
dvc repro

# Run a single stage (MLflow still logs that stage's run)
python src/stages/stage_03_model_trainer.py
python src/stages/stage_04_model_evaluation.py

# Run with different hyperparams — change params.yaml first, then repro
dvc repro model_trainer model_evaluation
```

---

### Comparing Runs in the CLI

```bash
# List all runs in the experiment
mlflow runs list --experiment-name IMDB_Sentiment_Analysis

# Search runs with a filter expression
mlflow runs search \
  --experiment-name IMDB_Sentiment_Analysis \
  --filter "metrics.accuracy > 0.86"

# Get details of a specific run
mlflow runs describe --run-id <run-id>
```

---

### Logging & Downloading Artifacts

```bash
# Download artifacts from a run to a local directory
mlflow artifacts download \
  --run-id <run-id> \
  --artifact-path plots \
  --dst-path ./downloaded_artifacts

# List artifacts in a run
mlflow artifacts list --run-id <run-id>
```

---

### MLflow Projects (re-running from any machine)

```bash
# Run the project using the MLproject file
mlflow run . -P epochs=15 -P batch_size=32

# Run from a git repo directly
mlflow run https://github.com/your-username/your-repo \
  -P epochs=10
```

---

### DagsHub — Free Remote for DVC + MLflow

[DagsHub](https://dagshub.com) hosts both DVC remote storage and MLflow tracking for free. To enable it:

1. Create a free account at [dagshub.com](https://dagshub.com) and create a repo.
2. Update `.env`:

```env
MLFLOW_TRACKING_URI=https://dagshub.com/your_username/your_repo.mlflow
MLFLOW_TRACKING_USERNAME=your_dagshub_username
MLFLOW_TRACKING_PASSWORD=your_dagshub_access_token
```

3. Configure DVC remote (DagsHub also acts as a DVC remote):

```bash
dvc remote add -d origin https://dagshub.com/your_username/your_repo.dvc
dvc remote modify origin --local auth basic
dvc remote modify origin --local user your_dagshub_username
dvc remote modify origin --local password your_dagshub_access_token
```

4. Push data and models:

```bash
dvc push
git push
```

All MLflow runs will now appear on your DagsHub experiment dashboard, and teammates can pull data with `dvc pull`.

---

### Typical DVC + MLflow Workflow

```bash
# 1. Edit params.yaml (e.g., change epochs: 10 → 15)

# 2. Run the pipeline — DVC skips unchanged stages, MLflow logs new runs
dvc repro

# 3. Open the MLflow UI to visually compare this run with previous ones
mlflow ui

# 4. Check metric changes in the terminal
dvc metrics diff
mlflow runs list --experiment-name IMDB_Sentiment_Analysis

# 5. If the new run is better, commit and push
git add dvc.lock params.yaml
git commit -m "experiment: epochs=15, F1 improved to 0.873"
dvc push
git push
```

---

## Running the API

### Locally

```bash
python app.py
```

The API will be available at `http://localhost:8080`.

| URL | Description |
|-----|-------------|
| `http://localhost:8080/` | Landing page |
| `http://localhost:8080/ui` | Single prediction dashboard |
| `http://localhost:8080/ui/batch` | Batch prediction page |
| `http://localhost:8080/docs` | Swagger UI |
| `http://localhost:8080/health` | JSON health check |

### With Docker

```bash
docker build -t imdb-sentiment .
docker run -p 8080:8080 imdb-sentiment
```

---

## API Reference

### Health Check

```
GET /health
GET /api/health
```

**Response**:
```json
{
  "status": "✅ API is running",
  "model": "Bi-LSTM Sentiment Classifier",
  "version": "1.0.0"
}
```

---

### Single Review Prediction

```
POST /predict
```

**Request body**:
```json
{
  "review": "This movie was absolutely fantastic! The acting was brilliant."
}
```

**Response**:
```json
{
  "review": "This movie was absolutely fantastic! The acting was brilliant.",
  "sentiment": "Positive 😊",
  "confidence": 97.43,
  "probability": 0.9743
}
```

---

### Batch Prediction

```
POST /predict/batch
```

Accepts 1–50 reviews per request.

**Request body**:
```json
{
  "reviews": [
    "One of the best films I have ever seen!",
    "Worst movie ever. Complete waste of time."
  ]
}
```

**Response**:
```json
{
  "total": 2,
  "results": [
    {
      "review": "One of the best films I have ever seen!",
      "sentiment": "Positive 😊",
      "confidence": 96.12,
      "probability": 0.9612
    },
    {
      "review": "Worst movie ever. Complete waste of time.",
      "sentiment": "Negative 😞",
      "confidence": 94.87,
      "probability": 0.0513
    }
  ]
}
```

---

## Dataset

**IMDB Dataset of 50K Movie Reviews** — sourced from Kaggle.

- 50,000 movie reviews, balanced: 25,000 positive / 25,000 negative
- Train/Test split: 80% / 20% (stratified)
- Kaggle dataset: [lakshmi25npathi/imdb-dataset-of-50k-movie-reviews](https://www.kaggle.com/datasets/lakshmi25npathi/imdb-dataset-of-50k-movie-reviews)

---

## Tech Stack

| Category         | Library / Tool                        |
|------------------|---------------------------------------|
| Deep Learning    | TensorFlow / Keras                    |
| ML Utilities     | scikit-learn                          |
| Data Processing  | Pandas, NumPy                         |
| Pipeline / DVC   | DVC                                   |
| API Framework    | FastAPI, Uvicorn                      |
| Visualization    | Matplotlib, Seaborn                   |
| Data Source      | Kaggle API                            |
| Containerization | Docker                                |
| Config           | PyYAML, python-box, python-dotenv     |
