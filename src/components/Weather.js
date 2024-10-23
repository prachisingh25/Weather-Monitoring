import React, { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import "../App.css";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler
);

const Weather = () => {
  const initialCities = [
    "Delhi",
    "Mumbai",
    "Chennai",
    "Bangalore",
    "Kolkata",
    "Hyderabad",
  ];

  const [weatherData, setWeatherData] = useState(
    JSON.parse(localStorage.getItem("weatherData")) || []
  );
  const [city, setCity] = useState("");
  const [cities, setCities] = useState(
    JSON.parse(localStorage.getItem("cities")) || initialCities
  );
  const [lastUpdated, setLastUpdated] = useState(null);
  const [dailySummaries, setDailySummaries] = useState([]);
  const [temperatureThreshold, setTemperatureThreshold] = useState(35);
  const [alertHistory, setAlertHistory] = useState([]);

  const apiKey = YOUR_API_KEY;
  const chartRef = useRef();
  const [chartReady, setChartReady] = useState(false);
  const chartContainerRef = useRef(null);

  const fetchData = async () => {
    try {
      const cityWeatherPromises = cities.map((city) =>
        axios.get(
          `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`
        )
      );
      const responses = await Promise.all(cityWeatherPromises);
      const weatherDataArray = responses.map((response) => response.data);
      setWeatherData(weatherDataArray);
      localStorage.setItem("weatherData", JSON.stringify(weatherDataArray));
      setLastUpdated(Date.now());
      calculateDailyAggregates(weatherDataArray);
      checkAlerts(weatherDataArray);
    } catch (error) {
      console.error("Error fetching weather data:", error);
    }
  };

  const calculateDailyAggregates = (data) => {
    const dailySummary = {
      date: new Date().toISOString().split("T")[0],
      averageTemperature:
        data.reduce((sum, item) => sum + item.main.temp, 0) / data.length,
      maximumTemperature: Math.max(...data.map((item) => item.main.temp)),
      minimumTemperature: Math.min(...data.map((item) => item.main.temp)),
      dominantWeatherCondition: determineDominantWeather(data),
    };

    const existingSummaries =
      JSON.parse(localStorage.getItem("dailySummaries")) || [];
    localStorage.setItem(
      "dailySummaries",
      JSON.stringify([...existingSummaries, dailySummary])
    );
    setDailySummaries([...existingSummaries, dailySummary]);
  };

  const determineDominantWeather = (data) => {
    const weatherConditions = data.map((item) => item.weather[0].description);
    const conditionCounts = weatherConditions.reduce((acc, condition) => {
      acc[condition] = (acc[condition] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(conditionCounts).reduce((a, b) =>
      conditionCounts[a] > conditionCounts[b] ? a : b
    );
  };

  const checkAlerts = (data) => {
    data.forEach((item) => {
      if (item.main.temp > temperatureThreshold) {
        const alertMessage = `Alert: ${item.name} temperature exceeded ${temperatureThreshold}°C. Current: ${item.main.temp}°C`;
        if (!alertHistory.includes(alertMessage)) {
          setAlertHistory((prev) => [...prev, alertMessage]);
          console.warn(alertMessage);
        }
      } else if (item.main.temp < 0) {
        const alertMessage = `Alert: ${item.name} temperature is below 0°C. Current: ${item.main.temp}°C`;
        if (!alertHistory.includes(alertMessage)) {
          setAlertHistory((prev) => [...prev, alertMessage]);
          console.warn(alertMessage);
        }
      }
    });
  };

  const handleDownloadReport = () => {
    const reportData = {
      weatherData,
      dailySummaries,
      alerts: alertHistory,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "weather_report.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 300000);
    return () => clearInterval(intervalId);
  }, [cities]);

  const handleInputChange = (e) => {
    setCity(e.target.value);
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (city && !cities.includes(city)) {
      try {
        const response = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`
        );
        setWeatherData([...weatherData, response.data]);
        const updatedCities = [...cities, city];
        setCities(updatedCities);
        localStorage.setItem("cities", JSON.stringify(updatedCities));
        setCity("");
      } catch (error) {
        console.error(
          "Error fetching weather data for the searched city:",
          error
        );
        alert("City not found or API error.");
      }
    } else {
      alert("City already in the list or empty input.");
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };
  const updateChart = useCallback(() => {
    const chart = chartRef.current;
    if (chart && chart.chartInstance) {
      chart.chartInstance.update();
    }
  }, []);

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 300000);
    return () => clearInterval(intervalId);
  }, [cities]);

  useEffect(() => {
    if (dailySummaries.length > 0 && chartContainerRef.current) {
      setChartReady(true);
    }
  }, [dailySummaries]);
  // Data for the chart visualization
  const chartData = {
    labels: dailySummaries.map((summary) => summary.date),
    datasets: [
      {
        label: "Average Temperature (°C)",
        data: dailySummaries.map((summary) => summary.averageTemperature),
        borderColor: "rgba(75, 192, 192, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        fill: true,
      },
      {
        label: "Maximum Temperature (°C)",
        data: dailySummaries.map((summary) => summary.maximumTemperature),
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        fill: true,
      },
      {
        label: "Minimum Temperature (°C)",
        data: dailySummaries.map((summary) => summary.minimumTemperature),
        borderColor: "rgba(255, 206, 86, 1)",
        backgroundColor: "rgba(255, 206, 86, 0.2)",
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  useEffect(() => {
    const chartInstance = chartRef.current;
    if (chartInstance) {
      chartInstance.update();
    }
    return () => {
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, [chartData]);

  return (
    <div className="weather-container">
      <h1 className="weather-title">Weather Information for Major Cities</h1>

      <form onSubmit={handleSearchSubmit} className="weather-search-form">
        <input
          type="text"
          placeholder="Enter city name"
          value={city}
          onChange={handleInputChange}
          className="weather-search-input"
        />
        <button type="submit" className="weather-search-button">
          Search
        </button>
      </form>

      <div className="weather-cards-container">
        {weatherData.length > 0 ? (
          weatherData.map((data) => (
            <div key={data.id} className="weather-card">
              <h2>{data.name}</h2>
              <p>Temperature: {data.main.temp}°C</p>
              <p>Description: {data.weather[0].description}</p>
              <p>Feels like: {data.main.feels_like}°C</p>
              <p>Humidity: {data.main.humidity}%</p>
              <p>Pressure: {data.main.pressure} hPa</p>
              <p>Wind Speed: {data.wind.speed} m/s</p>
            </div>
          ))
        ) : (
          <p>Loading weather data...</p>
        )}
      </div>

      {lastUpdated && (
        <p className="last-updated" style={{ fontSize: "14px" }}>
          Last updated: {formatTimestamp(lastUpdated)} (Unix: {lastUpdated})
        </p>
      )}

      {/* Download report button */}
      <button onClick={handleDownloadReport} className="weather-report-button">
        Download Full Weather Report
      </button>

      {/* Alerts Section */}
      <div className="alert-section">
        <h2>Triggered Alerts</h2>
        {alertHistory.length > 0 ? (
          alertHistory.map((alert, index) => (
            <p key={index} className="alert">
              {alert}
            </p>
          ))
        ) : (
          <p>No alerts triggered.</p>
        )}
      </div>

      {/* Chart Visualization */}
      <div className="chart-container" ref={chartContainerRef}>
        <h2>Daily Temperature Summary</h2>
        {chartReady && (
          <ErrorBoundary>
            <Line data={chartData} options={chartOptions} className="chart" />
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
};
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.log("Chart Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h3>Unable to display chart. Please try again later.</h3>;
    }

    return this.props.children;
  }
}
export default Weather;
