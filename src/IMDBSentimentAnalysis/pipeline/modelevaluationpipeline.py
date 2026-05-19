import logging
from src.IMDBSentimentAnalysis.config.configuration import ConfigurationManager
from src.IMDBSentimentAnalysis.components.ModelEvaluation import ModelEvaluation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

STAGE_NAME = "Model Evaluation Stage"


class ModelEvaluationPipeline:
    def __init__(self):
        pass

    def run(self):
        config      = ConfigurationManager()
        eval_cfg    = config.get_model_evaluation_config()

        evaluation  = ModelEvaluation(config=eval_cfg)
        evaluation.run()
