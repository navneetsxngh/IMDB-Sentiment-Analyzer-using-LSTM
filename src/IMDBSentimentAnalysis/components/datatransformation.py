import re
import pickle
import numpy as np
import pandas as pd
import logging

from sklearn.model_selection import train_test_split
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences

from src.IMDBSentimentAnalysis.entity.config_entity import DataTransformationConfig, Params

logger = logging.getLogger(__name__)


class DataTransformation:
    def __init__(self, config: DataTransformationConfig, params: Params):
        self.config = config
        self.params = params


    # ── Step 1: Load Data ─────────────────────────────────────────
    def load_data(self) -> pd.DataFrame:
        try:
            df = pd.read_csv(self.config.data_path)
            logger.info(f"Data loaded      : {df.shape}")
            return df

        except Exception as e:
            logger.error(f"Failed to load data: {e}")
            raise e


    # ── Step 2: Clean Text ────────────────────────────────────────
    def clean_text(self, text: str) -> str:
        # Remove HTML tags
        text = re.sub(r'<.*?>', '', text)
        # Remove special characters and numbers
        text = re.sub(r'[^a-zA-Z\s]', '', text)
        # Lowercase
        text = text.lower().strip()
        return text


    def preprocess_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        try:
            logger.info("Cleaning text...")

            df['review']    = df['review'].apply(self.clean_text)
            df['sentiment'] = df['sentiment'].map({'positive': 1, 'negative': 0})

            # Drop nulls if any
            df.dropna(inplace=True)

            logger.info(f"Text cleaned      : {df.shape}")
            logger.info(f"Sentiment dist   :\n{df['sentiment'].value_counts()}")

            return df

        except Exception as e:
            logger.error(f"Preprocessing failed: {e}")
            raise e


    # ── Step 3: Train Test Split ──────────────────────────────────
    def split_data(self, df: pd.DataFrame):
        try:
            X = df['review'].values
            y = df['sentiment'].values

            X_train, X_test, y_train, y_test = train_test_split(
                X, y,
                test_size    = self.params.test_size,
                random_state = self.params.random_state,
                stratify     = y
            )

            logger.info(f"Train size        : {X_train.shape[0]}")
            logger.info(f"Test size         : {X_test.shape[0]}")

            return X_train, X_test, y_train, y_test

        except Exception as e:
            logger.error(f"Split failed: {e}")
            raise e


    # ── Step 4: Tokenize ──────────────────────────────────────────
    def tokenize(self, X_train, X_test):
        try:
            tokenizer = Tokenizer(
                num_words  = self.params.max_words,
                oov_token  = "<OOV>"
            )

            # Fit only on training data
            tokenizer.fit_on_texts(X_train)

            X_train_seq = tokenizer.texts_to_sequences(X_train)
            X_test_seq  = tokenizer.texts_to_sequences(X_test)

            logger.info(f"Vocabulary size   : {len(tokenizer.word_index)}")

            return tokenizer, X_train_seq, X_test_seq

        except Exception as e:
            logger.error(f"Tokenization failed: {e}")
            raise e


    # ── Step 5: Pad Sequences ─────────────────────────────────────
    def pad(self, X_train_seq, X_test_seq):
        try:
            X_train_pad = pad_sequences(
                X_train_seq,
                maxlen    = self.params.max_len,
                padding   = 'post',
                truncating= 'post'
            )

            X_test_pad = pad_sequences(
                X_test_seq,
                maxlen    = self.params.max_len,
                padding   = 'post',
                truncating= 'post'
            )

            logger.info(f"Train padded shape: {X_train_pad.shape}")
            logger.info(f"Test padded shape : {X_test_pad.shape}")

            return X_train_pad, X_test_pad

        except Exception as e:
            logger.error(f"Padding failed: {e}")
            raise e


    # ── Step 6: Save Tokenizer ────────────────────────────────────
    def save_tokenizer(self, tokenizer: Tokenizer):
        try:
            with open(self.config.tokenizer_path, 'wb') as f:
                pickle.dump(tokenizer, f)

            logger.info(f"Tokenizer saved   : {self.config.tokenizer_path}")

        except Exception as e:
            logger.error(f"Tokenizer save failed: {e}")
            raise e


    # ── Step 7: Save Train/Test Arrays ───────────────────────────
    def save_arrays(self, X_train_pad, X_test_pad, y_train, y_test):
        try:
            np.savez(
                self.config.train_data_path,
                X = X_train_pad,
                y = y_train
            )

            np.savez(
                self.config.test_data_path,
                X = X_test_pad,
                y = y_test
            )

            logger.info(f"Train data saved  : {self.config.train_data_path}")
            logger.info(f"Test data saved   : {self.config.test_data_path}")

        except Exception as e:
            logger.error(f"Saving arrays failed: {e}")
            raise e


    # ── Master Method ─────────────────────────────────────────────
    def run(self):
        df = self.load_data()
        df = self.preprocess_dataframe(df)
        X_train, X_test, y_train, y_test = self.split_data(df)
        tokenizer, X_train_seq, X_test_seq = self.tokenize(X_train, X_test)
        X_train_pad, X_test_pad = self.pad(X_train_seq, X_test_seq)
        self.save_tokenizer(tokenizer)
        self.save_arrays(X_train_pad, X_test_pad, y_train, y_test)