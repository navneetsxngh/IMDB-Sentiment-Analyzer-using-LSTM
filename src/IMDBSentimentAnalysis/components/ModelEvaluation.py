import os
import json
import pickle
import numpy as np
import logging
import matplotlib.pyplot as plt
import seaborn as sns

import mlflow
from dotenv import load_dotenv

from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
    f1_score,
    precision_score,
    recall_score
)

from tensorflow.keras.models import load_model
from src.IMDBSentimentAnalysis.entity.config_entity import ModelEvaluationConfig

load_dotenv()
logger = logging.getLogger(__name__)


class ModelEvaluation:
    def __init__(self, config: ModelEvaluationConfig):
        self.config = config


    # ── Step 1: Load Model ────────────────────────────────────────
    def load_model(self):
        try:
            model = load_model(self.config.model_path)
            logger.info(f" Model loaded      : {self.config.model_path}")
            return model

        except Exception as e:
            logger.error(f" Model load failed : {e}")
            raise e


    # ── Step 2: Load Test Data ────────────────────────────────────
    def load_test_data(self):
        try:
            test   = np.load(self.config.test_data_path)
            X_test = test['X']
            y_test = test['y']

            logger.info(f"Test data loaded  : {X_test.shape}")
            return X_test, y_test

        except Exception as e:
            logger.error(f"Test data load failed: {e}")
            raise e


    # ── Step 3: Load History ──────────────────────────────────────
    def load_history(self):
        try:
            with open(self.config.history_path, 'rb') as f:
                history = pickle.load(f)

            logger.info(f" History loaded    : {self.config.history_path}")
            return history

        except Exception as e:
            logger.error(f" History load failed: {e}")
            raise e


    # ── Step 4: Generate Predictions ─────────────────────────────
    def predict(self, model, X_test):
        try:
            y_prob = model.predict(X_test, verbose=0)
            y_pred = (y_prob >= 0.5).astype(int).flatten()

            logger.info(" Predictions generated")
            return y_pred, y_prob

        except Exception as e:
            logger.error(f" Prediction failed: {e}")
            raise e


    # ── Step 5: Generate & Save Report ───────────────────────────
    def save_report(self, y_test, y_pred):
        try:
            report = {
                "accuracy" : float(np.round(accuracy_score(y_test,  y_pred), 4)),
                "precision": float(np.round(precision_score(y_test, y_pred), 4)),
                "recall"   : float(np.round(recall_score(y_test,    y_pred), 4)),
                "f1_score" : float(np.round(f1_score(y_test,        y_pred), 4)),
            }

            with open(self.config.report_path, 'w') as f:
                json.dump(report, f, indent=4)

            logger.info(f" Evaluation Report:")
            logger.info(f"   Accuracy  : {report['accuracy']  * 100:.2f}%")
            logger.info(f"   Precision : {report['precision'] * 100:.2f}%")
            logger.info(f"   Recall    : {report['recall']    * 100:.2f}%")
            logger.info(f"   F1 Score  : {report['f1_score']  * 100:.2f}%")
            logger.info(f"\n{classification_report(y_test, y_pred, target_names=['Negative', 'Positive'])}")

            return report

        except Exception as e:
            logger.error(f" Report save failed: {e}")
            raise e


    # ── Step 6: Confusion Matrix Plot ─────────────────────────────
    def plot_confusion_matrix(self, y_test, y_pred):
        try:
            cm = confusion_matrix(y_test, y_pred)

            plt.figure(figsize=(8, 6))
            sns.heatmap(
                cm,
                annot       = True,
                fmt         = 'd',
                cmap        = 'Blues',
                xticklabels = ['Negative', 'Positive'],
                yticklabels = ['Negative', 'Positive']
            )
            plt.title('Confusion Matrix', fontsize=15, fontweight='bold')
            plt.xlabel('Predicted Label', fontsize=12)
            plt.ylabel('True Label', fontsize=12)
            plt.tight_layout()
            plt.savefig(self.config.confusion_matrix_path, dpi=150)
            plt.close()

            logger.info(f" Confusion matrix saved: {self.config.confusion_matrix_path}")

        except Exception as e:
            logger.error(f" Confusion matrix plot failed: {e}")
            raise e


    # ── Step 7: Accuracy Plot ─────────────────────────────────────
    def plot_accuracy(self, history: dict):
        try:
            plt.figure(figsize=(10, 5))
            plt.plot(history['accuracy'],     label='Train Accuracy', color='blue',   linewidth=2)
            plt.plot(history['val_accuracy'], label='Val Accuracy',   color='orange', linewidth=2)
            plt.title('Model Accuracy over Epochs', fontsize=15, fontweight='bold')
            plt.xlabel('Epoch', fontsize=12)
            plt.ylabel('Accuracy', fontsize=12)
            plt.legend(fontsize=11)
            plt.grid(True, alpha=0.3)
            plt.tight_layout()
            plt.savefig(self.config.accuracy_plot_path, dpi=150)
            plt.close()

            logger.info(f" Accuracy plot saved   : {self.config.accuracy_plot_path}")

        except Exception as e:
            logger.error(f" Accuracy plot failed: {e}")
            raise e


    # ── Step 8: Loss Plot ─────────────────────────────────────────
    def plot_loss(self, history: dict):
        try:
            plt.figure(figsize=(10, 5))
            plt.plot(history['loss'],     label='Train Loss', color='blue', linewidth=2)
            plt.plot(history['val_loss'], label='Val Loss',   color='red',  linewidth=2)
            plt.title('Model Loss over Epochs', fontsize=15, fontweight='bold')
            plt.xlabel('Epoch', fontsize=12)
            plt.ylabel('Loss', fontsize=12)
            plt.legend(fontsize=11)
            plt.grid(True, alpha=0.3)
            plt.tight_layout()
            plt.savefig(self.config.loss_plot_path, dpi=150)
            plt.close()

            logger.info(f" Loss plot saved       : {self.config.loss_plot_path}")

        except Exception as e:
            logger.error(f" Loss plot failed: {e}")
            raise e


    # ── Master Method ─────────────────────────────────────────────
    def run(self):
        mlflow.set_tracking_uri(os.getenv("MLFLOW_TRACKING_URI", "mlruns"))
        mlflow.set_experiment(os.getenv("MLFLOW_EXPERIMENT_NAME", "IMDB_Sentiment_Analysis"))

        with mlflow.start_run(run_name="model_evaluation"):

            # ── Tags ──────────────────────────────────────────────
            mlflow.set_tags({
                "stage": "model_evaluation",
                "model": "Bi-LSTM",
            })

            # ── Run evaluation pipeline ───────────────────────────
            model          = self.load_model()
            X_test, y_test = self.load_test_data()
            history        = self.load_history()
            y_pred, y_prob = self.predict(model, X_test)

            report = self.save_report(y_test, y_pred)
            self.plot_confusion_matrix(y_test, y_pred)
            self.plot_accuracy(history)
            self.plot_loss(history)

            # ── Log scalar metrics ────────────────────────────────
            mlflow.log_metrics({
                "accuracy" : report["accuracy"],
                "precision": report["precision"],
                "recall"   : report["recall"],
                "f1_score" : report["f1_score"],
            })

            # ── Log artifacts ─────────────────────────────────────
            mlflow.log_artifact(str(self.config.report_path),           artifact_path="metrics")
            mlflow.log_artifact(str(self.config.confusion_matrix_path), artifact_path="plots")
            mlflow.log_artifact(str(self.config.accuracy_plot_path),    artifact_path="plots")
            mlflow.log_artifact(str(self.config.loss_plot_path),        artifact_path="plots")

            logger.info(f"MLflow run logged: {mlflow.active_run().info.run_id}")
