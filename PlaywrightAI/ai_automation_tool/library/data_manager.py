# library/data_manager.py

import json
import os
from datetime import datetime
import csv

class DataManager:
    def __init__(self, output_base_dir="output"):
        self.output_base_dir = output_base_dir
        os.makedirs(self.output_base_dir, exist_ok=True)

    def save_data(self, project_name, data, format="json"):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        project_dir = os.path.join(self.output_base_dir, project_name)
        run_dir = os.path.join(project_dir, f"run_{timestamp}")
        os.makedirs(run_dir, exist_ok=True)

        file_path = os.path.join(run_dir, f"extracted_data.{format}")
        if format == "json":
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        elif format == "csv":
            if not data: # Handle empty data
                with open(file_path, "w", encoding="utf-8", newline="") as f:
                    f.write("")
                print(f"Empty data saved to {file_path}")
                return file_path

            # Assuming data is a list of dictionaries for CSV
            if isinstance(data, list) and all(isinstance(d, dict) for d in data):
                keys = data[0].keys()
                with open(file_path, "w", encoding="utf-8", newline="") as output_file:
                    dict_writer = csv.DictWriter(output_file, keys)
                    dict_writer.writeheader()
                    dict_writer.writerows(data)
            else:
                raise ValueError("Data for CSV format must be a list of dictionaries.")
        print(f"Data saved to {file_path}")
        return file_path

    def save_log(self, project_name, log_content):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        project_dir = os.path.join(self.output_base_dir, project_name)
        run_dir = os.path.join(project_dir, f"run_{timestamp}")
        os.makedirs(run_dir, exist_ok=True)

        file_path = os.path.join(run_dir, "logs.txt")
        with open(file_path, "a", encoding="utf-8") as f:
            f.write(log_content + "\n")
        print(f"Log saved to {file_path}")
        return file_path


