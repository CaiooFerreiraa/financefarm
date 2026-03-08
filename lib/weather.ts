import * as Location from 'expo-location';

export interface WeatherData {
  temp: number;
  condition: string;
  conditionIcon: 'Sun' | 'Cloud' | 'CloudRain' | 'Wind';
  humidity: number;
  wind: number;
  location: string;
  forecast: Array<{ day: string; temp: number; icon: 'Sun' | 'Cloud' | 'CloudRain' | 'Wind' }>;
}

export async function getCurrentWeather(): Promise<WeatherData> {
  let { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permissão de localização negada');
  }

  let location = await Location.getCurrentPositionAsync({});
  const { latitude, longitude } = location.coords;

  // Force Portuguese language in the request
  const response = await fetch(`https://wttr.in/${latitude},${longitude}?format=j1&lang=pt`);
  const data = await response.json();

  const current = data.current_condition[0];

  // Try to get PT description from API, otherwise fallback to standard and manual translation
  const weatherDesc = current.lang_pt?.[0]?.value || current.weatherDesc[0].value;

  const iconMap: Record<string, 'Sun' | 'Cloud' | 'CloudRain' | 'Wind'> = {
    'Sunny': 'Sun',
    'Clear': 'Sun',
    'Partly cloudy': 'Cloud',
    'Cloudy': 'Cloud',
    'Overcast': 'Cloud',
    'Mist': 'Cloud',
    'Fog': 'Cloud',
    'Patchy rain nearby': 'CloudRain',
    'Patchy rain possible': 'CloudRain',
    'Light rain': 'CloudRain',
    'Heavy rain': 'CloudRain',
    'Thundery outbreaks nearby': 'CloudRain',
    'Moderate rain': 'CloudRain',
    'Showers': 'CloudRain',
    'Patchy light rain': 'CloudRain',
    'Light rain shower': 'CloudRain',
    'Patchy light drizzle': 'CloudRain',
  };

  const conditionIcon = iconMap[current.weatherDesc[0].value] || 'Cloud';

  // We want EXACTLY 5 days of forecast
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const forecast: Array<{ day: string; temp: number; icon: 'Sun' | 'Cloud' | 'CloudRain' | 'Wind' }> = [];

  // Consistent date logic for local time
  for (let i = 0; i < 5; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);

    // YYYY-MM-DD
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const realDayData = data.weather?.find((w: any) => w.date === dateStr);
    const dayName = dayNames[d.getDay()];

    if (realDayData) {
      const hourlyData = realDayData.hourly?.[4] || realDayData.hourly?.[0];
      const desc = hourlyData?.weatherDesc?.[0]?.value || 'Sunny';

      forecast.push({
        day: dayName,
        temp: parseInt(realDayData.avgtempC),
        icon: iconMap[desc] || 'Sun',
      });
    } else {
      const lastTemp = forecast.length > 0 ? forecast[forecast.length - 1].temp : parseInt(current.temp_C);
      forecast.push({
        day: dayName,
        temp: lastTemp,
        icon: 'Sun'
      });
    }
  }

  return {
    temp: parseInt(current.temp_C),
    condition: weatherDesc,
    conditionIcon: conditionIcon,
    humidity: parseInt(current.humidity),
    wind: parseInt(current.windspeedKmph),
    location: data.nearest_area[0].areaName?.[0]?.value || 'Minha Fazenda',
    forecast,
  };
}
