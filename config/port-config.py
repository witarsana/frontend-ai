#!/usr/bin/env python3
"""
Port configuration reader for Python backend
"""
import json
import os
from pathlib import Path
from typing import Dict, Any

class PortConfig:
    def __init__(self):
        config_path = Path(__file__).parent / "ports.json"
        try:
            with open(config_path, 'r') as f:
                self.config = json.load(f)
        except FileNotFoundError:
            raise FileNotFoundError(f"Port configuration file not found: {config_path}")
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in port configuration: {e}")

    @property
    def backend_port(self) -> int:
        return self.config["backend"]["port"]

    @property
    def backend_host(self) -> str:
        return self.config["backend"]["host"]

    @property
    def frontend_port(self) -> int:
        return self.config["frontend"]["port"]

    @property
    def frontend_host(self) -> str:
        return self.config["frontend"]["host"]

    @property
    def backend_url(self) -> str:
        return self.config["urls"]["backend"]

    @property
    def frontend_url(self) -> str:
        return self.config["urls"]["frontend"]

    @property
    def api_docs_url(self) -> str:
        return self.config["urls"]["api_docs"]

    def get_env_vars(self) -> Dict[str, Any]:
        """Get environment variables for the configuration"""
        return {
            "BACKEND_PORT": self.backend_port,
            "BACKEND_HOST": self.backend_host,
            "FRONTEND_PORT": self.frontend_port,
            "FRONTEND_HOST": self.frontend_host,
            "API_BASE_URL": self.backend_url
        }

    def print_config(self):
        """Print the configuration"""
        print("🔧 Port Configuration:")
        print(f"   Backend:  {self.backend_url}")
        print(f"   Frontend: {self.frontend_url}")
        print(f"   API Docs: {self.api_docs_url}")

if __name__ == "__main__":
    import sys
    
    config = PortConfig()
    
    if len(sys.argv) == 1:
        config.print_config()
    elif sys.argv[1] == "backend-port":
        print(config.backend_port)
    elif sys.argv[1] == "frontend-port":
        print(config.frontend_port)
    elif sys.argv[1] == "backend-url":
        print(config.backend_url)
    elif sys.argv[1] == "frontend-url":
        print(config.frontend_url)
    elif sys.argv[1] == "env":
        env_vars = config.get_env_vars()
        for key, value in env_vars.items():
            print(f"export {key}={value}")
    else:
        print("Usage: python port-config.py [backend-port|frontend-port|backend-url|frontend-url|env]")
