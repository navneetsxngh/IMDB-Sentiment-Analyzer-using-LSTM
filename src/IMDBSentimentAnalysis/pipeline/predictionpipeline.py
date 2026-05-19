import logging
from src.IMDBSentimentAnalysis.config.configuration import ConfigurationManager
from src.IMDBSentimentAnalysis.components.prediction import PredictionPipeline

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

STAGE_NAME = "Prediction Stage"


class PredictionStagePipeline:
    def __init__(self):
        config                = ConfigurationManager()
        self.transform_cfg    = config.get_data_transformation_config()
        self.trainer_cfg      = config.get_model_trainer_config()
        self.params           = config.get_params()

        self.pipeline = PredictionPipeline(
            transform_config = self.transform_cfg,
            trainer_config   = self.trainer_cfg,
            params           = self.params
        )

        # Preload model and tokenizer once
        self.pipeline.load_model()
        self.pipeline.load_tokenizer()


    def predict_single(self, review: str) -> dict:
        return self.pipeline.predict(review)


    def predict_batch(self, reviews: list) -> list:
        return self.pipeline.predict_batch(reviews)