import requests
from app.config import OPENWEATHER_API

def get_city_temperature(city):

    url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={OPENWEATHER_API}&units=metric"

    r = requests.get(url)

    return r.json()["main"]["temp"]