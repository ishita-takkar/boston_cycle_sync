import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

console.log('Mapbox GL JS Loaded:', mapboxgl);

mapboxgl.accessToken = 'pk.eyJ1IjoiaXNoaXRhLXRha2thciIsImEiOiJjbWFyNzV4dXkwOGRyMmpvdHg0NG9ndXdnIn0.l8cw9ny9E996Tn0-ZW5pZg';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-71.09415, 42.36027],
  zoom: 12,
  minZoom: 5,
  maxZoom: 18
});

function getCoords(station) {
  const lon = parseFloat(station.Long);
  const lat = parseFloat(station.Lat);
  if (isNaN(lon) || isNaN(lat)) return { cx: 0, cy: 0 };
  const p = map.project(new mapboxgl.LngLat(lon, lat));
  return { cx: p.x, cy: p.y };
}

map.on('load', async () => {
  const stationUrl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
  const stationData = await d3.json(stationUrl);
  const stations = stationData.data.stations.filter(d => !isNaN(+d.Long) && !isNaN(+d.Lat));

  const trips = await d3.csv(
    'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv',
    (trip) => {
      trip.started_at = new Date(trip.started_at);
      trip.ended_at = new Date(trip.ended_at);
      return trip;
    },
  );

  let filteredStations = computeStationTraffic(stations, trips);

  const radiusScale = d3.scaleSqrt()
    .domain([0, d3.max(filteredStations, d => d.totalTraffic)])
    .range([0, 25]);

  const svg = d3.select('#map').select('svg');

  let circles = svg.selectAll('circle')
    .data(filteredStations, d => d.Number)
    .enter()
    .append('circle')
    .attr('r', d => radiusScale(d.totalTraffic))
    .attr('fill', 'steelblue')
    .attr('fill-opacity', 0.6)
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .style('pointer-events', 'auto')
    .each(function(d) {
      d3.select(this)
        .append('title')
        .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
    });

  function updatePositions() {
    circles.attr('cx', d => getCoords(d).cx)
           .attr('cy', d => getCoords(d).cy);
  }

  updatePositions();
  map.on('move', updatePositions);
  map.on('zoom', updatePositions);
  map.on('resize', updatePositions);
  map.on('moveend', updatePositions);

  const timeSlider = document.getElementById('time-slider');
  const selectedTime = document.getElementById('selected-time');
  const anyTimeLabel = document.getElementById('any-time');

  function updateScatterPlot(timeFilter) {
    const filteredTrips = filterTripsByTime(trips, timeFilter);
    filteredStations = computeStationTraffic(stations, filteredTrips);

    timeFilter === -1 ? radiusScale.range([0, 25]) : radiusScale.range([3, 50]);

    circles = svg.selectAll('circle')
      .data(filteredStations, d => d.Number)
      .join('circle')
        .attr('r', d => radiusScale(d.totalTraffic))
        .attr('fill', 'steelblue')
        .attr('fill-opacity', 0.6)
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .style('pointer-events', 'auto')
        .each(function(d) {
          d3.select(this).select('title').remove();
          d3.select(this)
            .append('title')
            .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
        });

    updatePositions();
  }

  function updateTimeDisplay() {
    const timeFilter = Number(timeSlider.value);

    if (timeFilter === -1) {
      selectedTime.textContent = '';
      anyTimeLabel.style.display = 'block';
    } else {
      selectedTime.textContent = formatTime(timeFilter);
      anyTimeLabel.style.display = 'none';
    }

    updateScatterPlot(timeFilter);
  }

  timeSlider.addEventListener('input', updateTimeDisplay);
  updateTimeDisplay();
});

function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes);
  return date.toLocaleString('en-US', { timeStyle: 'short' });
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function filterTripsByTime(trips, timeFilter) {
  return timeFilter === -1
    ? trips
    : trips.filter((trip) => {
        const startedMinutes = minutesSinceMidnight(trip.started_at);
        const endedMinutes = minutesSinceMidnight(trip.ended_at);
        return (
          Math.abs(startedMinutes - timeFilter) <= 60 ||
          Math.abs(endedMinutes - timeFilter) <= 60
        );
      });
}

function computeStationTraffic(stations, trips) {
  const departures = d3.rollup(trips, v => v.length, d => d.start_station_id);
  const arrivals = d3.rollup(trips, v => v.length, d => d.end_station_id);

  return stations.map((station) => {
    const id = station.Number;
    station.departures = departures.get(id) ?? 0;
    station.arrivals = arrivals.get(id) ?? 0;
    station.totalTraffic = station.departures + station.arrivals;
    return station;
  });
}
