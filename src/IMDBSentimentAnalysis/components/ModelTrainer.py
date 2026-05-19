import os
import pickle
import numpy as np
import logging

import mlflow
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import (
    Embedding,
    LSTM,
    Bidirectional,
    Dense,
    Dropout,
    SpatialDropout1D
)
from tensorflow.keras.callbacks import (
    EarlyStopping,
    ModelCheckpoint,
    ReduceLROnPlateau
)
from tensorflow.keras.optimizers import Adam
from dotenv import load_dotenv

from src.IMDBSentimentAnalysis.entity.config_entity import ModelTrainerConfig, Params

load_dotenv()
logger = logging.getLogger(__name__)


# ── MLflow per-epoch callback ─────────────────────────────────────
class _MLflowCallback(tf.keras.callbacks.Callback):
    def on_epoch_end(self, epoch, logs=None):
        if logs:
            mlflow.log_metrics(
                {
                    "train_loss"    : logs.get("loss",         0),
                    "train_accuracy": logs.get("accuracy",     0),
                    "val_loss"      : logs.get("val_loss",     0),
                    "val_accuracy"  : logs.get("val_accuracy", 0),
                },
                step=epoch + 1,
            )


class ModelTrainer:
    def __init__(self, config: ModelTrainerConfig, params: Params):
        self.config = config
        self.params = params


    # ── Step 1: Load Transformed Data ────────────────────────────
    def load_data(self, train_path: str, test_path: str):
        try:
            train = np.load(train_path)
            test  = np.load(test_path)

            X_train, y_train = train['X'], train['y']
            X_test,  y_test  = test['X'],  test['y']

            logger.info(f"Train loaded      : {X_train.shape}")
            logger.info(f"Test loaded       : {X_test.shape}")

            return X_train, X_test, y_train, y_test

        except Exception as e:
            logger.error(f"Data loading failed: {e}")
            raise e


    # ── Step 2: Build LSTM Model ──────────────────────────────────
    def build_model(self) -> Sequential:
        try:
            model = Sequential([
                Embedding(
                    input_dim    = self.params.max_words,
                    output_dim   = self.params.embedding_dim,
                    input_shape  = (self.params.max_len,)
                ),

                SpatialDropout1D(self.params.dropout_rate),

                Bidirectional(LSTM(
                    units             = self.params.lstm_units,
                    return_sequences  = True,
                    dropout           = self.params.dropout_rate,
                    recurrent_dropout = 0.2
                )),

                Bidirectional(LSTM(
                    units             = self.params.lstm_units // 2,
                    return_sequences  = False,
                    dropout           = self.params.dropout_rate,
                    recurrent_dropout = 0.2
                )),

                Dense(64, activation='relu'),
                Dropout(self.params.dropout_rate),

                Dense(1, activation='sigmoid')
            ])

            model.compile(
                optimizer = Adam(learning_rate=self.params.learning_rate),
                loss      = 'binary_crossentropy',
                metrics   = ['accuracy']
            )

            model.build(input_shape=(None, self.params.max_len))
            model.summary(print_fn=logger.info)
            logger.info(" Model built successfully")

            return model

        except Exception as e:
            logger.error(f"Model build failed: {e}")
            raise e


    # ── Step 3: Callbacks ─────────────────────────────────────────
    def get_callbacks(self) -> list:
        early_stopping = EarlyStopping(
            monitor              = 'val_loss',
            patience             = 3,
            restore_best_weights = True,
            verbose              = 1
        )

        model_checkpoint = ModelCheckpoint(
            filepath       = self.config.model_path,
            monitor        = 'val_accuracy',
            save_best_only = True,
            verbose        = 1
        )

        reduce_lr = ReduceLROnPlateau(
            monitor  = 'val_loss',
            factor   = 0.2,
            patience = 2,
            min_lr   = 1e-6,
            verbose  = 1
        )

        return [early_stopping, model_checkpoint, reduce_lr, _MLflowCallback()]


    # ── Step 4: Train Model ───────────────────────────────────────
    def train(self, model, X_train, y_train, X_test, y_test):
        try:
            logger.info("Training started...")

            history = model.fit(
                X_train, y_train,
                validation_data = (X_test, y_test),
                epochs          = self.params.epochs,
                batch_size      = self.params.batch_size,
                callbacks       = self.get_callbacks(),
                verbose         = 1
            )

            logger.info("Training completed")
            return history

        except Exception as e:
            logger.error(f"Training failed: {e}")
            raise e


    # ── Step 5: Save History ──────────────────────────────────────
    def save_history(self, history):
        try:
            with open(self.config.history_path, 'wb') as f:
                pickle.dump(history.history, f)

            logger.info(f"History saved     : {self.config.history_path}")

        except Exception as e:
            logger.error(f"History save failed: {e}")
            raise e


    # ── Step 6: Evaluate ──────────────────────────────────────────
    def evaluate(self, model, X_test, y_test):
        try:
            loss, accuracy = model.evaluate(X_test, y_test, verbose=0)

            logger.info(f"Test Loss         : {loss:.4f}")
            logger.info(f"Test Accuracy     : {accuracy * 100:.2f}%")

            return loss, accuracy

        except Exception as e:
            logger.error(f"Evaluation failed: {e}")
            raise e


    # ── Master Method ─────────────────────────────────────────────
    def run(self, train_path: str, test_path: str):
        mlflow.set_tracking_uri(os.getenv("MLFLOW_TRACKING_URI", "mlruns"))
        mlflow.set_experiment(os.getenv("MLFLOW_EXPERIMENT_NAME", "IMDB_Sentiment_Analysis"))

        with mlflow.start_run(run_name="model_training"):

            # ── Tags ──────────────────────────────────────────────
            mlflow.set_tags({
                "stage"    : "model_training",
                "model"    : "Bi-LSTM",
                "framework": "TensorFlow/Keras",
            })

            # ── Log all hyperparameters ───────────────────────────
            mlflow.log_params({
                "max_words"    : self.params.max_words,
                "max_len"      : self.params.max_len,
                "embedding_dim": self.params.embedding_dim,
                "lstm_units"   : self.params.lstm_units,
                "dropout_rate" : self.params.dropout_rate,
                "batch_size"   : self.params.batch_size,
                "epochs"       : self.params.epochs,
                "learning_rate": self.params.learning_rate,
                "test_size"    : self.params.test_size,
                "random_state" : self.params.random_state,
            })

            # ── Run pipeline steps ────────────────────────────────
            X_train, X_test, y_train, y_test = self.load_data(train_path, test_path)

            mlflow.log_params({
                "train_samples": int(X_train.shape[0]),
                "test_samples" : int(X_test.shape[0]),
            })

            model   = self.build_model()
            history = self.train(model, X_train, y_train, X_test, y_test)

            self.save_history(history)

            # ── Log final test metrics ────────────────────────────
            loss, accuracy = self.evaluate(model, X_test, y_test)
            mlflow.log_metrics({
                "final_test_loss"    : np.round(float(loss),     4),
                "final_test_accuracy": np.round(float(accuracy), 4),
            })

            # ── Log model + history as artifacts ──────────────────
            mlflow.log_artifact(str(self.config.model_path),  artifact_path="model")
            mlflow.log_artifact(str(self.config.history_path), artifact_path="model")

            logger.info(f"MLflow run logged: {mlflow.active_run().info.run_id}")
