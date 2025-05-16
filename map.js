import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

console.log('Mapbox GL JS Loaded:', mapboxgl);

mapboxgl.accessToken = 'pk.eyJ1IjoiaXNoaXRhLXRha2thciIsImEiOiJjbWFyNzV4dXkwOGRyMmpvdHg0NG9ndXdnIn0.l8cw9ny9E996Tn0-ZW5pZg';

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/mapbox/streets-v12', // Map style
  center: [-71.0917417, 42.3058292], // [longitude, latitude]
  zoom: 12, // Initial zoom level
  minZoom: 5, // Minimum allowed zoom
  maxZoom: 18, // Maximum allowed zoom
});

function getCoords(station) {
  const p = map.project(new mapboxgl.LngLat(+station.Long, +station.Lat));
  return { cx: p.x, cy: p.y };
}

map.on('load', async () => {

     const bikeLanePaint = {
    'line-color': 'hsl(160, 30%, 60%)',
    'line-width': 4,
    'line-opacity': 0.8
  };

  map.addSource('boston_route', {
  type: 'geojson',
  data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
});

map.addLayer({
  id: 'bike-lanes',
  type: 'line',
  source: 'boston_route',
  paint: bikeLanePaint
});

 console.log('Bike lanes added!');

   map.addSource('cambridge_route', {
    type: 'geojson',
    data:
     'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson'
  });

  map.addLayer({
    id: 'bike-lanes-cambridge',
    type: 'line',
    source: 'cambridge_route',
    paint: bikeLanePaint
  });

  console.log('Boston & Cambridge bike lanes added!');

try {
    const url      = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
    const jsonData = await d3.json(url);
    const stations = jsonData.data.stations;

    const svg = d3.select('#map').select('svg');
    const circles = svg.selectAll('circle')
      .data(stations)
      .enter()
      .append('circle')
        .attr('r', 5)
        .attr('fill', 'steelblue')
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .attr('opacity', 0.8);

    function updatePositions() {
      circles
        .attr('cx', d => getCoords(d).cx)
        .attr('cy', d => getCoords(d).cy);
    }

    updatePositions();
    map.on('move',    updatePositions);
    map.on('zoom',    updatePositions);
    map.on('resize',  updatePositions);
    map.on('moveend', updatePositions);

  } catch (error) {
    console.error('Error loading or drawing stations:', error);
  }

  
});
