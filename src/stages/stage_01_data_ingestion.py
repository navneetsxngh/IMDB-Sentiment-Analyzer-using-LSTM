import logging
from src.IMDBSentimentAnalysis.pipeline.dataingestionpipeline import DataIngestionTrainingPipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

STAGE_NAME = "Data Ingestion Stage"

if __name__ == "__main__":
    logger.info(f">>>>>> {STAGE_NAME} started <<<<<<")
    pipeline = DataIngestionTrainingPipeline()
    pipeline.initiate_data_ingestion()
    logger.info(f">>>>>> {STAGE_NAME} completed <<<<<<\n\nx==========x")
