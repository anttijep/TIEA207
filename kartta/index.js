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
import { WSHandler } from "./wshandler";
import Feature from 'ol/Feature';
import {Circle, Fill, Stroke, Style} from 'ol/style';
import {Vector as VectorLayer} from 'ol/layer';
import {Vector as VectorSource} from 'ol/source';
import Point from 'ol/geom/Point';
import Collection from 'ol/Collection';


proj4.defs("EPSG:3067", "+proj=utm +zone=35 +ellps=GRS80 +units=m +no_defs");
register(proj4);
var projection = getProjection("EPSG:3067");
var capabilitiesUrl = 'https://avoin-karttakuva.maanmittauslaitos.fi/avoin/wmts/1.0.0/WMTSCapabilities.xml';
var markerDict = {};
// Markerin piirtäminen
var positionMarker = new Feature();
positionMarker.setStyle(new Style({
	image: new Circle({
		radius: 12,
		fill: new Fill({
			color: '#ffff00'
		}),
		stroke: new Stroke({
			color: '#000000',
			width: 2
		})
	})	
}));

// https://openlayers.org/en/latest/doc/faq.html#why-is-the-order-of-a-coordinate-lon-lat-and-not-lat-lon-
var myPosition = transform([25.749498121, 62.241677684], "EPSG:4326", "EPSG:3067");

if (navigator.geolocation) {
	navigator.geolocation.getCurrentPosition(function(position) {
		var latitude = position.coords.latitude;
		var longitude = position.coords.longitude;
		var accuracy = position.coords.accuracy;
		var debuginfo = document.getElementById("debuginfo");
		debuginfo.innerHTML = "latitude: " + latitude + ", longitude: " + longitude + ", accuracy: " + accuracy;
		myPosition = transform([longitude, latitude], "EPSG:4326", "EPSG:3067");
		positionMarker.setGeometry(myPosition ? new Point(myPosition) : null);
		view.setCenter(myPosition);
	});
} else {
	console.log("Geolocation API is not supported in your browser.");
}

console.log(myPosition);


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
var parser = new WMTSCapabilities();
var markerLayer = new Collection();
markerLayer.push(positionMarker);
var view = new View({
			projection: projection,
			center: myPosition,
			zoom: 10
		});
var map = new Map({
		controls: defaultControls().extend([mousePositionControl]),
		layers: [
			new VectorLayer({
				source: new VectorSource({
					features: markerLayer
				}),
				zIndex: 5
			})
		],
		target: 'map',
		view: view
	});

var types = require('./testprotocol_pb');
var hostname = "ws://127.0.0.1:5678";
var wsh = new WSHandler(hostname);

// esim. chat eventtien lukeminen
function test(msg) {
	var messages = document.getElementById('chattesti');
	var message = document.createElement('li');
	message.appendChild(document.createTextNode(msg.getMsg()));
	messages.appendChild(message);
}
wsh.addChatMessageListener(test);
//wsh.removeChatMessageListener(test);
// end

function updateLocation(msg) {
	var s = msg.getSenderid() + ": " + msg.getLatitude()+ ", " + msg.getLongitude();
	var lonlat = transform([msg.getLongitude(), msg.getLatitude()], "EPSG:4326", "EPSG:3067");
	if (msg.getSenderid() in markerDict) {
		markerDict[msg.getSenderid()].setGeometry(lonlat ? new Point(lonlat) : null);
	} else {
		var markkeri = new Feature();
		markkeri.setStyle(new Style({
				image: new Circle({
				radius: 12,
				fill: new Fill({
				color: '#ff00ff'
			}),
			stroke: new Stroke({
				color: '#000000',
				width: 2
				})
			})	
		}));
		
		markerDict[msg.getSenderid()] = markkeri;
		markkeri.setGeometry(lonlat ? new Point(lonlat) : null);
		markerLayer.push(markkeri);
	}
}
wsh.addLocationChangeListener(updateLocation);

fetch(capabilitiesUrl).then(function(response) {
	return response.text();
}).then(function(text) {
	var result = parser.read(text);
	var options = optionsFromCapabilities(result, {
		layer: 'maastokartta',
		matrixSet: 'EPSG:3067'
	});
	var tl = new TileLayer({
				opacity: 1,
				source: new WMTS(options),
				zIndex: 0
			});
	map.addLayer(tl);
	/* map = new Map({
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
			center: myPosition,
			zoom: 10
		})
	}); */
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


