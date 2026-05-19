import logging
from src.IMDBSentimentAnalysis.config.configuration import ConfigurationManager
from src.IMDBSentimentAnalysis.components.datatransformation import DataTransformation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DataTransformationPipeline:
    def __init__(self):
        pass

    def run(self):
        config          = ConfigurationManager()
        transform_cfg   = config.get_data_transformation_config()
        params          = config.get_params()

        transformation  = DataTransformation(config = transform_cfg, params = params)
        transformation.run()