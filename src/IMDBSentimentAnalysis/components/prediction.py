import re
import pickle
import numpy as np
import logging

from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences

from src.IMDBSentimentAnalysis.entity.config_entity import DataTransformationConfig, ModelTrainerConfig, Params

logger = logging.getLogger(__name__)


class PredictionPipeline:
    def __init__(
        self,
        transform_config : DataTransformationConfig,
        trainer_config   : ModelTrainerConfig,
        params           : Params
    ):
        self.transform_config = transform_config
        self.trainer_config   = trainer_config
        self.params           = params
        self.model            = None
        self.tokenizer        = None


    # ── Step 1: Load Model ────────────────────────────────────────
    def load_model(self):
        try:
            self.model = load_model(self.trainer_config.model_path)
            logger.info(f"Model loaded      : {self.trainer_config.model_path}")

        except Exception as e:
            logger.error(f"Model load failed : {e}")
            raise e


    # ── Step 2: Load Tokenizer ────────────────────────────────────
    def load_tokenizer(self):
        try:
            with open(self.transform_config.tokenizer_path, 'rb') as f:
                self.tokenizer = pickle.load(f)
            logger.info(f"Tokenizer loaded  : {self.transform_config.tokenizer_path}")

        except Exception as e:
            logger.error(f"Tokenizer load failed: {e}")
            raise e


    # ── Step 3: Clean Text ────────────────────────────────────────
    def clean_text(self, text: str) -> str:
        text = re.sub(r'<.*?>', '', text)           # remove HTML tags
        text = re.sub(r'[^a-zA-Z\s]', '', text)    # remove special chars
        text = text.lower().strip()
        return text


    # ── Step 4: Preprocess Input ──────────────────────────────────
    def preprocess(self, review: str) -> np.ndarray:
        try:
            cleaned  = self.clean_text(review)
            sequence = self.tokenizer.texts_to_sequences([cleaned])
            padded   = pad_sequences(
                sequence,
                maxlen    = self.params.max_len,
                padding   = 'post',
                truncating= 'post'
            )
            return padded

        except Exception as e:
            logger.error(f"❌ Preprocessing failed: {e}")
            raise e


    # ── Step 5: Predict Single Review ────────────────────────────
    def predict(self, review: str) -> dict:
        try:
            if self.model is None:
                self.load_model()
            if self.tokenizer is None:
                self.load_tokenizer()

            padded      = self.preprocess(review)
            probability = self.model.predict(padded, verbose=0)[0][0]
            label       = "Positive 😊" if probability >= 0.5 else "Negative 😞"
            confidence  = probability if probability >= 0.5 else 1 - probability

            result = {
                "review"     : review,
                "sentiment"  : label,
                "confidence" : round(float(confidence) * 100, 2),
                "probability": round(float(probability), 4)
            }

            logger.info(f"Sentiment  : {result['sentiment']}")
            logger.info(f"Confidence : {result['confidence']}%")

            return result

        except Exception as e:
            logger.error(f"Prediction failed: {e}")
            raise e


    # ── Step 6: Predict Batch Reviews ────────────────────────────
    def predict_batch(self, reviews: list) -> list:
        try:
            if self.model is None:
                self.load_model()
            if self.tokenizer is None:
                self.load_tokenizer()

            results = []
            for review in reviews:
                result = self.predict(review)
                results.append(result)

            logger.info(f"Batch predicted   : {len(results)} reviews")
            return results

        except Exception as e:
            logger.error(f"Batch prediction failed: {e}")
            raise e