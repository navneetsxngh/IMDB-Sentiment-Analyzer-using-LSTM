from src.IMDBSentimentAnalysis.constants import *
from src.IMDBSentimentAnalysis.utils.main import read_yaml, create_directories
from src.IMDBSentimentAnalysis.entity.config_entity import (DataIngestionConfig, 
                                                            DataTransformationConfig,
                                                            ModelTrainerConfig, 
                                                            Params, ModelEvaluationConfig)

class ConfigurationManager:
    def __init__(self, config_filepath = CONFIG_FILE_PATH, params_filepath = PARAMS_FILE_PATH):
        self.config = read_yaml(config_filepath)
        self.params = read_yaml(params_filepath)
        create_directories([self.config.artifacts_root])


    def get_data_ingestion_config(self) -> DataIngestionConfig:
        config = self.config.data_ingestion
        create_directories([config.root_dir])

        data_ingestion_config = DataIngestionConfig(
            root_dir        = config.root_dir,
            source_URL      = config.source_URL,
            local_data_file = config.local_data_file,
            unzip_dir       = config.unzip_dir
        )
        return data_ingestion_config
    
    def get_data_transformation_config(self) -> DataTransformationConfig:
        config = self.config.data_transformation
        create_directories([config.root_dir])

        return DataTransformationConfig(
            root_dir          = config.root_dir,
            data_path         = config.data_path,
            tokenizer_path    = config.tokenizer_path,
            train_data_path   = config.train_data_path,
            test_data_path    = config.test_data_path
        )

    def get_model_trainer_config(self) -> ModelTrainerConfig:
        config = self.config.model_trainer
        create_directories([config.root_dir])
        return ModelTrainerConfig(
            root_dir          = config.root_dir,
            model_path        = config.model_path,
            history_path      = config.history_path
        )
    
    def get_model_evaluation_config(self) -> ModelEvaluationConfig:
        config = self.config.model_evaluation
        create_directories([config.root_dir])
        return ModelEvaluationConfig(
            root_dir              = config.root_dir,
            model_path            = config.model_path,
            history_path          = config.history_path,
            test_data_path        = config.test_data_path,
            report_path           = config.report_path,
            confusion_matrix_path = config.confusion_matrix_path,
            accuracy_plot_path    = config.accuracy_plot_path,
            loss_plot_path        = config.loss_plot_path
        )
    
    def get_params(self) -> Params:
        params = self.params

        return Params(
            max_words     = params.max_words,
            max_len       = params.max_len,
            test_size     = params.test_size,
            random_state  = params.random_state,
            batch_size    = params.batch_size,
            epochs        = params.epochs,
            embedding_dim = params.embedding_dim,
            lstm_units    = params.lstm_units,
            dropout_rate  = params.dropout_rate,
            learning_rate = params.learning_rate
        )
