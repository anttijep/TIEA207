import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import WMTS, {optionsFromCapabilities} from 'ol/source/WMTS';
import proj4 from 'proj4';
import {register} from 'ol/proj/proj4';
import {get as getProjection} from 'ol/proj';
import MousePosition from 'ol/control/MousePosition';
import {createStringXY} from 'ol/coordinate';
import {defaults as defaultControls} from 'ol/control';
import {transform} from 'ol/proj';

proj4.defs("EPSG:3067", "+proj=utm +zone=35 +ellps=GRS80 +units=m +no_defs");
register(proj4);
var projection = getProjection("EPSG:3067");
var capabilitiesUrl = 'https://avoin-karttakuva.maanmittauslaitos.fi/avoin/wmts/1.0.0/WMTSCapabilities.xml';


// https://openlayers.org/en/latest/doc/faq.html#why-is-the-order-of-a-coordinate-lon-lat-and-not-lat-lon-
var jyvaskyla = transform([25.749498121, 62.241677684], "EPSG:4326", "EPSG:3067");

var parser = new WMTSCapabilities();
var map;


fetch(capabilitiesUrl).then(function(response) {
  return response.text();
}).then(function(text) {
  var result = parser.read(text);
  var options = optionsFromCapabilities(result, {
    layer: 'maastokartta',
    matrixSet: 'EPSG:3067'
  });

  map = new Map({
    controls: defaultControls().extend([mousePositionControl]),
    layers: [
      new TileLayer({
        opacity: 1,
        source: new WMTS(options)
      })
    ],
    target: 'map',
    view: new View({
      projection: projection,
      center: jyvaskyla,
      zoom: 8
    })
  });
});

// https://openlayers.org/en/latest/examples/mouse-position.html
var mousePositionControl = new MousePosition({
  coordinateFormat: createStringXY(4),
  projection: 'EPSG:3067',
  // comment the following two lines to have the mouse position
  // be placed within the map.
  className: 'custom-mouse-position',
  target: document.getElementById('mouse-position'),
  undefinedHTML: '&nbsp;'
});
var projectionSelect = document.getElementById('projection');
projectionSelect.addEventListener('change', function(event) {
  mousePositionControl.setProjection(event.target.value);
});

var precisionInput = document.getElementById('precision');
precisionInput.addEventListener('change', function(event) {
  var format = createStringXY(event.target.valueAsNumber);
  mousePositionControl.setCoordinateFormat(format);
});
