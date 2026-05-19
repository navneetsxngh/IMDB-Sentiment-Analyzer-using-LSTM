import os
import zipfile
from pathlib import Path
from dotenv import load_dotenv
import kaggle
import logging

from src.IMDBSentimentAnalysis.entity.config_entity import DataIngestionConfig

load_dotenv()

logger = logging.getLogger(__name__)


class DataIngestion:
    def __init__(self, config: DataIngestionConfig):
        self.config = config


    def set_kaggle_credentials(self):
        """Load Kaggle credentials from .env file."""
        try:
            os.environ['KAGGLE_USERNAME'] = os.getenv('KAGGLE_USERNAME')
            os.environ['KAGGLE_KEY']      = os.getenv('KAGGLE_KEY')

            kaggle.api.authenticate()
            logger.info("✅ Kaggle credentials authenticated successfully")

        except Exception as e:
            logger.error(f"❌ Kaggle authentication failed: {e}")
            raise e


    def download_dataset(self):
        """Download dataset from Kaggle using source URL in config."""
        try:
            # Extract dataset identifier from URL
            # URL format: https://www.kaggle.com/datasets/<owner>/<dataset-name>
            dataset_id = "/".join(self.config.source_URL.split("/")[-2:])

            logger.info(f"Downloading dataset: {dataset_id}")
            logger.info(f"Saving to         : {self.config.root_dir}")

            kaggle.api.dataset_download_files(
                dataset   = dataset_id,
                path      = self.config.root_dir,
                unzip     = False           # we handle unzip separately
            )

            logger.info("Dataset downloaded successfully")

        except Exception as e:
            logger.error(f"Dataset download failed: {e}")
            raise e


    def extract_zip(self):
        """Extract downloaded zip file to unzip_dir."""
        try:
            unzip_path = self.config.unzip_dir

            os.makedirs(unzip_path, exist_ok=True)

            # Find the downloaded zip file
            zip_file_path = None
            for file in os.listdir(self.config.root_dir):
                if file.endswith(".zip"):
                    zip_file_path = os.path.join(self.config.root_dir, file)
                    break

            if zip_file_path is None:
                raise FileNotFoundError("No zip file found in root_dir")

            with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
                zip_ref.extractall(unzip_path)

            logger.info(f"Extracted zip to: {unzip_path}")

        except Exception as e:
            logger.error(f"Extraction failed: {e}")
            raise e


    def verify_data(self):
        """Verify the downloaded CSV file exists and is non-empty."""
        try:
            file_path = Path(self.config.local_data_file)

            if not file_path.exists():
                raise FileNotFoundError(f"Expected file not found: {file_path}")

            size_mb = file_path.stat().st_size / (1024 * 1024)

            logger.info(f"File verified    : {file_path}")
            logger.info(f"   File size        : {size_mb:.2f} MB")

        except Exception as e:
            logger.error(f"Verification failed: {e}")
            raise e