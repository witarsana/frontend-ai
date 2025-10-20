

# library/config_manager.py

import os
from dotenv import load_dotenv

class ConfigManager:
    def __init__(self):
        load_dotenv() # Load environment variables from .env file

    def get(self, key, default=None):
        return os.getenv(key, default)

    def get_required(self, key):
        value = self.get(key)
        if value is None:
            raise ValueError(f"Missing required configuration: {key}")
        return value


