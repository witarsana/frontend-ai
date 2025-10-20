import logging
import os
from datetime import datetime

class Logger:
    _instance = None

    def __new__(cls, log_dir="logs"):
        if cls._instance is None:
            cls._instance = super(Logger, cls).__new__(cls)
            cls._instance._initialize(log_dir)
        return cls._instance

    def _initialize(self, log_dir):
        self.log_dir = log_dir
        os.makedirs(self.log_dir, exist_ok=True)
        self.logger = logging.getLogger("ai_automation_tool")
        self.logger.setLevel(logging.INFO)

        # Prevent adding duplicate handlers if already initialized
        if not self.logger.handlers:
            # Create handlers
            c_handler = logging.StreamHandler()
            f_handler = logging.FileHandler(os.path.join(self.log_dir, f"automation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"))

            # Create formatters and add it to handlers
            c_format = logging.Formatter("%(name)s - %(levelname)s - %(message)s")
            f_format = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
            c_handler.setFormatter(c_format)
            f_handler.setFormatter(f_format)

            # Add handlers to the logger
            self.logger.addHandler(c_handler)
            self.logger.addHandler(f_handler)

    def info(self, message):
        self.logger.info(message)

    def warning(self, message):
        self.logger.warning(message)

    def error(self, message):
        self.logger.error(message)

    def debug(self, message):
        self.logger.debug(message)


