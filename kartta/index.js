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
import WSHandler from "./wshandler";
import Feature from 'ol/Feature';
import {Circle, Fill, Stroke, Style} from 'ol/style';
import {Vector as VectorLayer} from 'ol/layer';
import {Vector as VectorSource} from 'ol/source';
import Point from 'ol/geom/Point';
import Collection from 'ol/Collection';
import Draw from 'ol/interaction/Draw';
import Polygon from 'ol/geom/Polygon';
import LineString from "ol/geom/LineString";

var types = require('./testprotocol_pb');
var hostname = "ws://127.0.0.1:5678";
var wsh = new WSHandler(hostname);

proj4.defs("EPSG:3067", "+proj=utm +zone=35 +ellps=GRS80 +units=m +no_defs");
register(proj4);
var projection = getProjection("EPSG:3067");
var capabilitiesUrl = 'https://avoin-karttakuva.maanmittauslaitos.fi/avoin/wmts/1.0.0/WMTSCapabilities.xml';
var markerDict = {};
// Markerin piirtäminen
var positionMarker = new Feature();
var omaVari = "#ffff00";
positionMarker.setStyle(new Style({
	image: new Circle({
		radius: 12,
		fill: new Fill({
			color: omaVari
		}),
		stroke: new Stroke({
			color: '#000000',
			width: 4
		})
	})	
}));

var source = new VectorSource({wrapX: false});
var vector = new VectorLayer({
  source: source,
  style: new Style({
    fill: new Fill({
      color: 'rgba(255,255,0,0.5)'
    }),
    stroke: new Stroke({
      color: 'yellow',
      width: 7
    })
  })
});
// https://openlayers.org/en/latest/doc/faq.html#why-is-the-order-of-a-coordinate-lon-lat-and-not-lat-lon-
var myPosition = transform([25.749498121, 62.241677684], "EPSG:4326", "EPSG:3067");
var myAccuracy = 0;
var currentZoomLevel = 10;
var accuracyCircle = new Circle({
		radius: myAccuracy,
		fill: new Fill({
			color: omaVari
		}),
		stroke: new Stroke({
			color: '#ffffff',
			width: 1
		})
	});

var accuracyMarker = new Feature();
accuracyMarker.setStyle(new Style({
	image: accuracyCircle
}));

var view = new View({
			projection: projection,
			center: myPosition,
			zoom: currentZoomLevel,
			minZoom:0,
			maxZoom:18
		});

var parser = new WMTSCapabilities();
var scales = [];

if (navigator.geolocation) {
	navigator.geolocation.getCurrentPosition(function(position) {
		var latitude = position.coords.latitude;
		var longitude = position.coords.longitude;
		var accuracy = position.coords.accuracy;
		var debuginfo = document.getElementById("debuginfo");
		debuginfo.innerHTML = "longitude: " + longitude + ", latitude: " + latitude + ", accuracy: " + accuracy;
		myPosition = transform([longitude, latitude], "EPSG:4326", "EPSG:3067");
		positionMarker.setGeometry(myPosition ? new Point(myPosition) : null);
		myAccuracy = position.coords.accuracy;
		navigator.geolocation.watchPosition(function(position) {
			myPosition = transform([position.coords.longitude, position.coords.latitude], "EPSG:4326", "EPSG:3067");
			positionMarker.setGeometry(myPosition ? new Point(myPosition) : null);
			debuginfo.innerHTML = "longitude: " + position.coords.longitude + ", latitude: " + position.coords.latitude + ", accuracy: " + position.coords.accuracy;

			myAccuracy = position.coords.accuracy;
			
			console.log(scales);
			currentZoomLevel = Math.round(map.getView().getZoom());	
			// tile span metreinä (scales[currentZoomLevel].TileWidth * scales[currentZoomLevel].ScaleDenominator * 0.00028)
			var kaava = (myAccuracy / (scales[currentZoomLevel].ScaleDenominator * 0.00028));
			console.log('Tile width (m): ' + (scales[currentZoomLevel].TileWidth * scales[currentZoomLevel].ScaleDenominator * 0.00028) + ' / Rounded zoom level: ' + currentZoomLevel);
			console.log(kaava);
			console.log('Exact zoom level: ' + map.getView().getZoom());
			accuracyCircle.setRadius(kaava);
			accuracyMarker.setGeometry(myPosition ? new Point(myPosition) : null);
		});
		view.setCenter(myPosition);
	});
} else {
	console.log("Geolocation API is not supported in your browser.");
}

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

var markerLayer = new Collection();
var accuracyLayer = new Collection();
markerLayer.push(positionMarker);
accuracyLayer.push(accuracyMarker);

var map = new Map({
		controls: defaultControls().extend([mousePositionControl]),
		layers: [
			new VectorLayer({
				source: new VectorSource({
					features: markerLayer
				}),
				zIndex: 5
			}),
			new VectorLayer({
				opacity: 0.3,
				source: new VectorSource({
					features: accuracyLayer
				}),
				zIndex: 4
			})
		,vector],
		target: 'map',
		view: view
	});
	
map.on('moveend', function(event) {
	if (scales[currentZoomLevel] != undefined) {
		console.log(scales);
		if ((map.getView().getZoom()) - Math.floor(map.getView().getZoom()) > 0.35) currentZoomLevel = Math.ceil(map.getView().getZoom());
		else currentZoomLevel = Math.round(map.getView().getZoom());	
		// tile span metreinä (scales[currentZoomLevel].TileWidth * scales[currentZoomLevel].ScaleDenominator * 0.00028)
		var kaava = (myAccuracy / (scales[currentZoomLevel].ScaleDenominator * 0.00028));
		
		console.log('Tile width (m): ' + (scales[currentZoomLevel].TileWidth * scales[currentZoomLevel].ScaleDenominator * 0.00028) + ' / Rounded zoom level: ' + currentZoomLevel);
		console.log(kaava);
		console.log('Exact zoom level: ' + map.getView().getZoom());
		accuracyCircle.setRadius(kaava);
		accuracyMarker.setGeometry(myPosition ? new Point(myPosition) : null);
	}
});



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
	scales = result.Contents.TileMatrixSet[1].TileMatrix;	// xml:stä saadut arvot (EPSG:3067)
	var tl = new TileLayer({
				opacity: 1,
				source: new WMTS(options),
				zIndex: 0
			});
	map.addLayer(tl);
	map.removeLayer(vector);
  	map.addLayer(vector);
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

var vectorLayerSource = vector.getSource();
var vectorLayerFeatures =vectorLayerSource.getFeatures();

var typeSelect = document.getElementById('piirto');
var points;
var draw; // global so we can remove it later
var circleCenter;
var circleRadius;
function addInteraction() {
  var text = typeSelect.options[typeSelect.selectedIndex].text;
  var value = typeSelect.value;
  if (value !== 'None') {
    draw = new Draw({
      source: source,
      type: typeSelect.value,
      freehand: true
    });
    draw.on('drawend',function(e){
    if(text=="Circle"){
    	circleCenter = e.feature.getGeometry().getCenter();
    	circleRadius = e.feature.getGeometry().getRadius();
    	console.log("center "+circleCenter + " " + "radius "+circleRadius);
    	points = null;
    }
    else {
    points = e.feature.getGeometry().getCoordinates();
    console.log(e.feature.getGeometry().getCoordinates());
}
    //var feature = new Feature({
    //        geometry: new Polygon(points)
    //    });
 	//debugger;
 	//var feature =sendShapeCoord(event);

    //source.addFeature(feature);
    transformAndSendCoord(points);
    });
      map.addInteraction(draw);
      
  }
}
/**
 * Handle change event.
 */
typeSelect.onchange = function() {
  map.removeInteraction(draw);
  addInteraction();
};

function clearAll(event){
  event.preventDefault();
  vectorLayerSource.clear();
 // vector.setVisible(false);
 // vector.setVisible(true);
};
var testButton =document.getElementById("test");
var buttonId =document.getElementById("clear");
testButton.onclick = sendShapeCoord;
buttonId.onclick = clearAll;
function drawTest(){
	    var feature = new Feature({
            geometry: new Polygon(points)
        });
    source.addFeature(feature);
}

function transformAndSendCoord(points){
	var coordArray=[];
	var selected = document.getElementById("piirto");
	var text = selected.options[selected.selectedIndex].text;
	var trimmedCoord;
	var helpArray;
	var transformedCenter;
	if(text == "LineString"){
		for(var i=0;i<points.length;i++){
			trimmedCoord =points[i];
			coordArray[i]=transform(trimmedCoord,"EPSG:4326", "EPSG:3067");
		}
	}
	if(text == "Polygon"){
		for(var i=0;i<points[0].length;i++){
			helpArray = points[0]
			trimmedCoord =helpArray[i];
			coordArray[i]=transform(trimmedCoord,"EPSG:4326", "EPSG:3067");
		}
	}
	if(text == "Circle"){
		transformedCenter = transform(circleCenter,"EPSG:4326", "EPSG:3067");
	}
	console.log("global coordinates");
	if(text =="LineString" || text == "Polygon") console.log(coordArray);
	else {console.log("global center: "+transformedCenter+ "radius: " + circleRadius);}
}


function sendShapeCoord(){
	var shape;
	var selected = document.getElementById("piirto");
	var text = selected.options[selected.selectedIndex].text;
	if(text=="None") {return;}
	if(text=="LineString"){
		shape = new Feature({
			geometry: new LineString(points)
		})
		source.addFeature(shape);
		return shape;
	}
	if(text=="Polygon"){
		shape = new Feature({
			geometry: new Polygon(points)
		})
		source.addFeature(shape);
		return shape;
	}
	if(text=="Circle"){
		shape = new Feature({
			geometry: new Circle(points)
		})
		source.addFeature(shape);
		return shape;
	}
	else return;
}

var resolution = document.getElementById("resolution");




function changeResolution(){
	var text = resolution.options[resolution.selectedIndex].text;
	var sheet = document.createElement('style');
	if(text=="1200x900"){
		//map.style.width = "1200px";
		//map.style.height = "900px";
		var styleHTML = ".custommap {    width: 1200px;    height: 900px;}";
		sheet.innerHTML = styleHTML;
		document.body.appendChild(sheet);
		map.updateSize();
	}
	if(text=="750x1334"){
		//map.style.width = "750px";
		//map.style.height = "1334px";
		var styleHTML = ".custommap {    width: 750px;    height: 1334px;}";
		sheet.innerHTML = styleHTML;
		document.body.appendChild(sheet);
		map.updateSize();
	}
	if(text=="720x1280"){
		//map.style.width = "720px";
		//map.style.height = "1280px";
		var styleHTML = ".custommap {    width: 720px;    height: 1280px;}";
		sheet.innerHTML = styleHTML;
		document.body.appendChild(sheet);
		map.updateSize();
	}
}

//resolution.onchange = function(){
//	debugger;
//	changeResolution();
//}
//resolution.addEventListener("change",changeResolution);
