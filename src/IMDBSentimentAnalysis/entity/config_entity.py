from pathlib import Path
from dataclasses import dataclass

@dataclass(frozen=True)
class DataIngestionConfig:
    root_dir : Path
    source_URL: Path
    local_data_file : Path
    unzip_dir : Path

@dataclass(frozen=True)
class DataTransformationConfig:
    root_dir          : Path
    data_path         : Path
    tokenizer_path    : Path
    train_data_path   : Path
    test_data_path    : Path


@dataclass(frozen=True)
class Params:
    max_words     : int
    max_len       : int
    test_size     : float
    random_state  : int
    batch_size    : int
    epochs        : int
    embedding_dim : int
    lstm_units    : int
    dropout_rate  : float
    learning_rate : float

@dataclass(frozen=True)
class ModelTrainerConfig:
    root_dir          : Path
    model_path        : Path
    history_path      : Path

@dataclass(frozen=True)
class ModelEvaluationConfig:
    root_dir              : Path
    model_path            : Path
    history_path          : Path
    test_data_path        : Path
    report_path           : Path
    confusion_matrix_path : Path
    accuracy_plot_path    : Path
    loss_plot_path        : Path