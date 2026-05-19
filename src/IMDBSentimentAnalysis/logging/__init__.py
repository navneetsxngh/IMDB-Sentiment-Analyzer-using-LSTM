import os
import sys
import logging

logging_format = "[ %(asctime)s : %(levelname)s : %(module)s : %(message)s ]"

LOG_DIR = "logs"
LOG_FILENAME = "running_logs.log"
LOG_FILEPATH = os.path.join(LOG_DIR, LOG_FILENAME)

os.makedirs(LOG_DIR, exist_ok=True)

# Remove previous handlers (important in notebooks / reruns)
for handler in logging.root.handlers[:]:
    logging.root.removeHandler(handler)

logging.basicConfig(
    level=logging.INFO,
    format=logging_format,
    handlers=[
        logging.FileHandler(LOG_FILEPATH, mode="a", encoding="utf-8"),
        logging.StreamHandler(sys.stdout)
    ],
    force=True  
)

logger = logging.getLogger("IMDBlogger")

logger.info("Logger initialized successfully")