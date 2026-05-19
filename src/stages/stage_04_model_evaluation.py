import logging
from src.IMDBSentimentAnalysis.pipeline.modelevaluationpipeline import ModelEvaluationPipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

STAGE_NAME = "Model Evaluation Stage"

if __name__ == "__main__":
    logger.info(f">>>>>> {STAGE_NAME} started <<<<<<")
    pipeline = ModelEvaluationPipeline()
    pipeline.run()
    logger.info(f">>>>>> {STAGE_NAME} completed <<<<<<\n\nx==========x")
