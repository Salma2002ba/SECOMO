import csv
from datetime import datetime

FILE_PATH = "sensor_data.csv"

def read_sensor_data():

    readings = []

    with open(FILE_PATH, newline="") as csvfile:
        reader = csv.DictReader(csvfile)

        for row in reader:

            readings.append({
                "timestamp": datetime.fromisoformat(row["timestamp"]),
                "temperature_air": float(row["temperature_air"]),
                "humidity_air": float(row["humidity_air"]),
                "soil_moisture": float(row["soil_moisture"]),
                "light": float(row["light"]),
                "water_level": float(row["water_level"]),
                "ph": float(row["ph"])
            })

    return readings