import logging
from src.IMDBSentimentAnalysis.pipeline.modeltrainerpipeline import ModelTrainerPipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

STAGE_NAME = "Model Trainer Stage"

if __name__ == "__main__":
    logger.info(f">>>>>> {STAGE_NAME} started <<<<<<")
    pipeline = ModelTrainerPipeline()
    pipeline.run()
    logger.info(f">>>>>> {STAGE_NAME} completed <<<<<<\n\nx==========x")
