import os
import yaml
from src.IMDBSentimentAnalysis.logging import logger
import json
import joblib
from ensure import ensure_annotations
from box import ConfigBox
from pathlib import Path
from typing import Any
from box.exceptions import BoxValueError

import tensorflow as tf
from tensorflow.keras import layers as _kl
from tensorflow.keras.models import load_model as _keras_load_model


def _compat(base):
    """Return a subclass that silently drops 'quantization_config' from configs
    saved by newer Keras versions, so the legacy H5 loader can reconstruct them."""
    class _C(base):
        def __init__(self, *args, **kwargs):
            kwargs.pop('quantization_config', None)
            super().__init__(*args, **kwargs)
    _C.__name__ = base.__name__
    return _C


_COMPAT_OBJECTS = {
    cls.__name__: _compat(cls)
    for cls in [
        _kl.Dense, _kl.Embedding, _kl.LSTM,
        _kl.Dropout, _kl.Bidirectional,
    ]
}


def load_keras_model(path):
    return _keras_load_model(str(path), custom_objects=_COMPAT_OBJECTS)


@ensure_annotations
def read_yaml(path: Path) -> ConfigBox:
    """Reads Yaml file and returns

    Args:
        path (str) : path like input 
    Raises:
        ValueError: if yaml file is empty
        e: empty file

    Returns:
    ConfigBox: ConfigBox type
    """
    try:
        with open(path) as yaml_file:
            content = yaml.safe_load(yaml_file)
            logger.info(f"YAML file: {path} Loaded Successfully")
            return ConfigBox(content)
    except BoxValueError:
        raise ValueError("YAML file is Empty")
    except Exception as e:
        logger.error(e)
        raise e
    
@ensure_annotations
def create_directories(path_of_directories: list, verbose=True):
    """Create list of Directories

    Args:
        path_of_directories (list): list of path of directories
        ignore_log(bool, optional): Ignore if multiple dirs is to be created
    """

    for path in path_of_directories:
        os.makedirs(path, exist_ok=True)
        if verbose:
            logger.info(f"Create Directory at: {path}")

@ensure_annotations
def save_json(path: Path, data: dict):
    """Save JSON Data
    
    Args:
        path (Path): path to json file
        data (dict): data to be saved in json file
        """
    with open(path, "w") as f:
        json.dump(data, f, indent=4)
    
    logger.info(f"JSON file saved at: {path}")


@ensure_annotations
def load_json(path: Path) -> ConfigBox:
    """Load JSON files data
    
    Args:
        path (Path): path to json file

    Returns:
        ConfigBox: data as class attributes instead of dict
        """
    with open(path) as f:
        content = json.load(f)
    logger.info(f"JSON File loaded Successfully from: {path}")
    return ConfigBox(content)

## To save and load the Model
@ensure_annotations
def save_bin(data: Any, path: Path):
    """Save Binary Files
    
    Args:
        data (any): data to be saved as binary
        path (Path): path to binary files
    """
    joblib.dump(value=data, filename=path)
    logger.info(f"Binary file saved at: {path}")

@ensure_annotations
def load_bin(path: Path) -> Any:
    """Load Binary Files
    
    Args:
        path (Path): path to binary file
    
    Returns:
        Any: Object stored in the file
    """

    data = joblib.load(path)
    logger.info(f"Binary file loaded from: {path}")
    return data 