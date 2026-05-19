import logging
from src.IMDBSentimentAnalysis.config.configuration import ConfigurationManager
from src.IMDBSentimentAnalysis.components.ModelTrainer import ModelTrainer


class ModelTrainerPipeline:
    def __init__(self):
        pass

    def run(self):
        config          = ConfigurationManager()
        trainer_cfg     = config.get_model_trainer_config()
        transform_cfg   = config.get_data_transformation_config()
        params          = config.get_params()

        trainer = ModelTrainer(
            config = trainer_cfg,
            params = params
        )

        trainer.run(
            train_path = transform_cfg.train_data_path,
            test_path  = transform_cfg.test_data_path
        )