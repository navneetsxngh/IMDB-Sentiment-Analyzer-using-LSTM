from src.IMDBSentimentAnalysis.pipeline.dataingestionpipeline import DataIngestionTrainingPipeline
from src.IMDBSentimentAnalysis.pipeline.datatransformationpipeline import DataTransformationPipeline
from src.IMDBSentimentAnalysis.pipeline.modeltrainerpipeline import ModelTrainerPipeline
from src.IMDBSentimentAnalysis.pipeline.modelevaluationpipeline import ModelEvaluationPipeline
from src.IMDBSentimentAnalysis.pipeline.predictionpipeline import PredictionStagePipeline
from src.IMDBSentimentAnalysis.logging import logger


STAGE_NAME="Data Ingestion Stage"
try:
    logger.info(f">>>>>>>>Stage : {STAGE_NAME} Started <<<<<<<<<")
    obj = DataIngestionTrainingPipeline()
    obj.initiate_data_ingestion()
    logger.info(f">>>>>>>> Stage : {STAGE_NAME} Completed <<<<<<<<")
except Exception as e:
    logger.error(e)
    raise e


STAGE_NAME = "Data Transformation Stage"

try:
    logger.info(f">>>>>> {STAGE_NAME} started <<<<<<")
    pipeline = DataTransformationPipeline()
    pipeline.run()
    logger.info(f">>>>>> {STAGE_NAME} completed <<<<<<\n\nx==========x")

except Exception as e:
    logger.exception(e)
    raise e


STAGE_NAME = "Model Trainer Stage"

try:
    logger.info(f">>>>>> {STAGE_NAME} started <<<<<<")
    pipeline = ModelTrainerPipeline()
    pipeline.run()
    logger.info(f">>>>>> {STAGE_NAME} completed <<<<<<\n\nx==========x")

except Exception as e:
    logger.exception(e)
    raise e


STAGE_NAME = "Model Evaluation Stage"

try:
    logger.info(f">>>>>> {STAGE_NAME} started <<<<<<")
    pipeline = ModelEvaluationPipeline()
    pipeline.run()
    logger.info(f">>>>>> {STAGE_NAME} completed <<<<<<\n\nx==========x")

except Exception as e:
    logger.exception(e)
    raise e


STAGE_NAME = "Prediction Stage"

try:
    logger.info(f">>>>>> {STAGE_NAME} started <<<<<<")

    predictor = PredictionStagePipeline()

    # ── Single Review ─────────────────────────────────────────
    review = "This movie was absolutely fantastic! The acting was brilliant."
    result = predictor.predict_single(review)

    print("\n" + "="*55)
    print(f"  Review     : {result['review'][:60]}...")
    print(f"  Sentiment  : {result['sentiment']}")
    print(f"  Confidence : {result['confidence']}%")
    print(f"  Probability: {result['probability']}")
    print("="*55)

    # ── Batch Reviews ─────────────────────────────────────────
    batch_reviews = [
            "The plot was terrible and the acting was unbearable.",
            "One of the best films I have ever seen in my life!",
            "It was okay, nothing special, just average movie.",
            "Absolutely loved every minute of this masterpiece!",
            "Worst movie ever. Complete waste of time and money."
        ]

    print("\n── Batch Predictions ──────────────────────────────────")
    results = predictor.predict_batch(batch_reviews)
    for i, res in enumerate(results, 1):
        print(f"  {i}. {res['sentiment']}  ({res['confidence']}%)  |  {res['review'][:50]}...")
    print("="*55)

    logger.info(f">>>>>> {STAGE_NAME} completed <<<<<<\n\nx==========x")

except Exception as e:
    logger.exception(e)
    raise e