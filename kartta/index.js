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
import Geolocation from 'ol/Geolocation';
import MousePosition from 'ol/control/MousePosition';
import {createStringXY} from 'ol/coordinate';
import {defaults as defaultControls} from 'ol/control';
import {transform} from 'ol/proj';
import {WSHandler} from "./wshandler";
import Feature from 'ol/Feature';
import {Circle, Fill, Stroke, Style} from 'ol/style';
import {Vector as VectorLayer} from 'ol/layer';
import {Vector as VectorSource} from 'ol/source';
import Point from 'ol/geom/Point';
import Collection from 'ol/Collection';
import Draw from 'ol/interaction/Draw';
import Polygon from 'ol/geom/Polygon';
import LineString from "ol/geom/LineString";
import CircleGeom from "ol/geom/Circle";
import Select from 'ol/interaction/Select';
import iro from '@jaames/iro';


var types = require('./testprotocol_pb');
var hostname = process.env.HOSTNAME ? process.env.HOSTNAME : "ws://127.0.0.1:5678";
var wsh = new WSHandler(hostname);

var myId = -1;
function handleJoinMessage(msg) {
	myId = msg.getId();
}
wsh.addJoinResultListener(handleJoinMessage);

function debugLogin(e) {
/* 	wsh.login("testi"); */
	//wsh.joinRoom("testi");
}

var grouplist = {
	0:"-Unassigned-",
	1:"testitiimi2",
	2:"testitiimi3"
};
function onNewGroup(msg){
	grouplist[msg.getId()] = msg.getName();
}

var featureID = 0;
proj4.defs("EPSG:3067", "+proj=utm +zone=35 +ellps=GRS80 +units=m +no_defs");
register(proj4);
var projection = getProjection("EPSG:3067");
var capabilitiesUrl = 'https://avoin-karttakuva.maanmittauslaitos.fi/avoin/wmts/1.0.0/WMTSCapabilities.xml';
var markerDict = {};
// Markerin piirtäminen
var positionMarker = new Feature();
var omaVari = "#ffff00";	// oman sijainnin ja tarkkuuden väri
positionMarker.setStyle(new Style({
	image: new Circle({
		radius: 12,
		fill: new Fill({
			color: omaVari
		}),
		stroke: new Stroke({
			color: '#000000',
			width: 3
		})
	})	
}));

var dummysource = new VectorSource({wrapX: false});
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
			zoom: 10,
			maxZoom:18
		});

var parser = new WMTSCapabilities();
var scales = [];
var lastLocationUpdate = Date.now();

if (navigator.geolocation) {
	var firstCenter = true;
	navigator.geolocation.watchPosition(function(position) {
		var lastPosition = myPosition;
		myPosition = transform([position.coords.longitude, position.coords.latitude], "EPSG:4326", "EPSG:3067");
		var lastAccuracy = myAccuracy;
		myAccuracy = position.coords.accuracy;

		if (firstCenter) {
			firstCenter = false;
			view.setCenter(myPosition);
		}
		tbAccuracy = position.coords.accuracy;
		updateTopBar();
		positionMarker.setGeometry(myPosition ? new Point(myPosition) : null);
		//accuracyMarker.setGeometry(myPosition ? new Point(myPosition) : null);
 	
		if (myPosition[0] !== lastPosition[0] || myPosition[1] !== lastPosition[1] || myAccuracy !== lastAccuracy) scheduleUpdate();
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

var geolocation = new Geolocation({
  trackingOptions: {
    enableHighAccuracy: true
  },
  projection: view.getProjection()
});

geolocation.setTracking(true);

var accuracyFeature = new Feature();
geolocation.on('change:accuracyGeometry', function() {
  accuracyFeature.setGeometry(geolocation.getAccuracyGeometry());
});

var markerLayer = new Collection();
var accuracyLayer = new Collection();
markerLayer.push(positionMarker);
accuracyLayer.push(accuracyFeature);

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
				source: new VectorSource({
					features: accuracyLayer
				}),
				zIndex: 4
			})
		,vector],
		target: 'map',
		view: view
	});


/* map.on('moveend', changeAccuracy);

function changeAccuracy() {
	var scaleIndex = parseInt(view.getZoom());
	if ((map.getView().getZoom()) - Math.floor(map.getView().getZoom()) > 0.35) scaleIndex = Math.ceil(map.getView().getZoom());
	else scaleIndex = Math.round(map.getView().getZoom());	
	// tile span metreinä (scales[scaleIndex].TileWidth * scales[scaleIndex].ScaleDenominator * 0.00028)
	if (scales[scaleIndex] != undefined) {
		try	{
			var kaava = (myAccuracy / (scales[scaleIndex].ScaleDenominator * 0.00028));
			accuracyCircle.setRadius(kaava);
			accuracyMarker.setGeometry(myPosition ? new Point(myPosition) : null);
		} catch {
			// tänne päädyttäessä accuracyCirclen radius on todennäköisesti liian suuri OpenLayersin piirrettäväksi
			accuracyCircle.setRadius(0);
		}
	}
}; */

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
	if (msg.getSenderid() === myId || window.sessionStorage.key !== undefined) return;
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
					width: 3
				})
			})	
		}));
		markerDict[msg.getSenderid()] = markkeri;
		markerLayer.push(markerDict[msg.getSenderid()]);
		markkeri.setGeometry(lonlat ? new Point(lonlat) : null);
	}
}
wsh.addLocationChangeListener(updateLocation);

// käyttäjän siirtäminen ryhmästä toiseen ja disconnectaamisen händläys?
function userMove(msg) {
	if (msg.getDisconnected() == true) {
		markerLayer.remove(markerDict[msg.getUserid()]);
    /** TODO: poista käyttäjä vielä markerDictistä? **/
	}
}
wsh.addUserMovedListener(userMove);


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

var locationUpdating = false;

function scheduleUpdate() {
	if (locationUpdating == true) {
		return;
	}
	locationUpdating = true;
	sendPositionDataToServer();
	
}

// Sijainnin ja sen tarkkuuden lähetys palvelimelle
function sendPositionDataToServer() {
	var timeDiff = Date.now() - lastLocationUpdate;
	if (timeDiff < 1000) {
		setTimeout(sendPositionDataToServer, 1000 - timeDiff);
		return;
	}
	lastLocationUpdate = Date.now();
	var wCoords = transform(myPosition, "EPSG:3067", "EPSG:4326");
	var lon = wCoords[0];
	var lat = wCoords[1];
	var acc = myAccuracy;	
	wsh.sendLocation(lat, lon, acc);
	locationUpdating = false;

}

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
typeSelect.value = "None";
var points;
var draw; // global so we can remove it later
var circleCenter;
var circleRadius;
var fillRed = document.getElementById("fillRed");
var fillGreen = document.getElementById("fillGreen");
var fillBlue = document.getElementById("fillBlue");
var fillAlpha = document.getElementById("fillAlpha");
var strokeRed = document.getElementById("strokeRed");
var strokeGreen = document.getElementById("strokeGreen");
var strokeBlue = document.getElementById("strokeBlue");
var strokeAlpha = document.getElementById("strokeAlpha");
var strokeWidth =  document.getElementById("strokeWidth");
function addInteraction() {
  var text = typeSelect.options[typeSelect.selectedIndex].text;
  var value = typeSelect.value;
  if (value !== 'None') {
    draw = new Draw({
      source: dummysource,
      type: typeSelect.value,
      freehand: true
    });
    draw.on('drawend',function(e){
    if(text=="Circle"){
    	circleCenter = e.feature.getGeometry().getCenter();
    	circleRadius = e.feature.getGeometry().getRadius();
    	points = null;
    }
    else {
    points = e.feature.getGeometry().getCoordinates();
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
      dummysource.clear();     
  }
 }

var select = null;
var selectSingleclick = new Select();
var selectElement = document.getElementById('remove');
selectElement.value = "none";

var changeInteraction = function() {
  map.removeInteraction(draw);
  document.getElementById("linestringSettings").style.display = "none";
  document.getElementById("PolyCircleSettings").style.display = "none";
  if (select !== null) {
    map.removeInteraction(select);
  }
  var value = selectElement.value;
  if (value == 'remove') {
    select = selectSingleclick;
  }
  else {
    select = null;
  }
  if (select !== null) {
    map.addInteraction(select);
    select.on('select', function(e) {
		if (selectSingleclick.getLayer(e.selected[0]) == vector){
			source.removeFeature(e.selected[0]);	
		} 
		else {
			selectSingleclick.getFeatures().clear();
		}

    	//source.removeFeature(e.feature);
   // 	for(var i=0; i<feats.length;i++){
   // 		source.removeFeature(feats[i]);
   	//}
    	
    });
  }

};

selectElement.onchange = changeInteraction;

/**
 * Handle change event.
 */
typeSelect.onchange = function() {
  map.removeInteraction(select);
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

var PickerFillred = 255;
var PickerFillgreen = 255;
var PickerFillBlue = 255;
var	PickerStrokered = 255;
var	PickerStrokegreen = 255;
var	PickerStrokeBlue = 255;

function transformAndSendCoord(points){
	//debugger;
	var coordArray=[];
	var selected = document.getElementById("piirto");
	var text = selected.options[selected.selectedIndex].text;
	var trimmedCoord;
	var helpArray;
	var transformedCenter;
	var fillColor = rgbaToInt(parseInt(PickerFillred),parseInt(PickerFillgreen),parseInt(PickerFillBlue),5);
	var strokeColor = rgbaToInt(parseInt(PickerStrokered),parseInt(PickerStrokegreen),parseInt(PickerStrokeBlue),10);
	var width = parseInt(strokeWidth.value);
	if(text == "LineString"){
		for(var i=0;i<points.length;i++){
			trimmedCoord =points[i];
			coordArray[i]=transform(trimmedCoord,"EPSG:3067","EPSG:4326");
		}
		wsh.sendLinestring(coordArray, strokeColor, width);
	}
	if(text == "Polygon"){
        var polyarray = [[]];
        for (var i=0; i < points.length;++i) {
            points[i].forEach(e=>polyarray[i].push(transform(e,"EPSG:3067","EPSG:4326")));
        }
        wsh.sendPolygon(polyarray,fillColor,strokeColor,width);
	}
	if(text == "Circle"){
		transformedCenter = transform(circleCenter,"EPSG:3067","EPSG:4326");
		wsh.sendCircle(transformedCenter,circleRadius,fillColor,strokeColor,width);

	}
}



function handleCircle(circle){
	//circleCenter = [circle.getCenter().getLongitude(),circle.getCenter().getLatitude()];
	var center = transform([circle.getCenter().getLongitude(),circle.getCenter().getLatitude()],"EPSG:4326","EPSG:3067");
	var radius = circle.getRadius();
	var fillColorInt = circle.getFill().getColor();
	var fillColor = intToRgba(fillColorInt);
	var strokeColorInt = circle.getStroke().getColor();
	var strokeColor = intToRgba(strokeColorInt);
	var width = circle.getStroke().getWidth();
	var circle = new CircleGeom(center,radius);
	var circlefeat = new Feature();

	circlefeat.setStyle(new Style({
   		fill: new Fill({
      		color: setRGBAFill(fillColor[0],fillColor[1],fillColor[2],fillColor[3]/10)
    		}),
   			stroke: new Stroke({
   			color: setRGBAFill(strokeColor[0],strokeColor[1],strokeColor[2],strokeColor[3]/10),
    		width: setWidth(width)
    		})
  	}));
  		featureID++;
  		circlefeat.setId(featureID);
  		circlefeat.setGeometry(circle);
		source.addFeature(circlefeat);
}

function handleLinestring(linestring){
	var linestringCoord = [];
	linestring.getPointarray().getPointsList().forEach(coord=>transformLinestring(coord,linestringCoord))
	var strokeColorInt = linestring.getStroke().getColor();
	var width = linestring.getStroke().getWidth();
	var strokeColor = intToRgba(strokeColorInt);
	var linestring = new LineString(linestringCoord);
	var linefeat = new Feature({
		geometry: linestring
	});
	linefeat.setStyle(new Style({
   			stroke: new Stroke({
   			color: setRGBAFill(strokeColor[0],strokeColor[1],strokeColor[2],strokeColor[3]/10),
    		width: setWidth(width)
    		})
  	}));
	featureID++;
	linefeat.setId(featureID);

	source.addFeature(linefeat);
}

function handlePolygon(polygon){
    var polypoints = [[]];
    var fillColorInt = polygon.getFill().getColor();
	var fillColor = intToRgba(fillColorInt);
	var strokeColorInt = polygon.getStroke().getColor();
	var strokeColor = intToRgba(strokeColorInt);
	var width = polygon.getStroke().getWidth();
    var parrlist = polygon.getPointarrayList();
    for (var i = 0; i < parrlist.length; ++i) {
        parrlist[i].getPointsList().forEach(e=>{
            var p = [e.getLongitude(), e.getLatitude()];
            polypoints[i].push(transform(p, "EPSG:4326","EPSG:3067"));
        });
    }
        
	var poly = new Polygon(polypoints);
	var polyfeat = new Feature({
		geometry: poly
	});
	polyfeat.setStyle(new Style({
   		fill: new Fill({
      		color: setRGBAFill(fillColor[0],fillColor[1],fillColor[2],fillColor[3]/10)
    		}),
   			stroke: new Stroke({
   			color: setRGBAFill(strokeColor[0],strokeColor[1],strokeColor[2],strokeColor[3]/10),
    		width: setWidth(width)
    		})
  	}));
	featureID++;
	source.addFeature(polyfeat);
}



function transformLinestring(coord,array){
	array.push(transform([coord.getLongitude(),coord.getLatitude()],"EPSG:4326","EPSG:3067"));
}



function drawReceivedDrawing(msg) {
	msg.getLinestringsList().forEach(lstrings=> handleLinestring(lstrings));

	msg.getCirclesList().forEach(circle =>handleCircle(circle));
    msg.getPolysList().forEach(poly=>handlePolygon(poly));
}

wsh.addReceiveDrawingListener(drawReceivedDrawing);

function intToRgba(int){
	var red = (int >> 24) & 0xFF;
	var green = int >> 16 & 0xFF;
	var blue = int >> 8 & 0xFF;
	var alpha = int >>0 & 0xFF;
	var array = [red,green,blue,alpha];
	return array;

}

function rgbaToInt(red,green,blue,alpha){
	//debugger;
	var r = red & 0xFF;
	var g = green & 0xFF;
	var b = blue & 0xFF;
	var a = alpha & 0xFF;

	var rgb = (r << 24) + (g << 16) + (b << 8) + (a);
	return rgb;
}

function setRGBAFill(red, green, blue, alpha){
	var color = "rgba("+red+","+green+","+blue+","+alpha+")";
	return color;
}

function setRGBAStroke(red,green,blue,alpha){
	var color = "rgba("+red+","+green+","+blue+","+alpha+")";
}

function setWidth(width){
	return width;
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
		
		var circle = new CircleGeom(circleCenter,circleRadius);
		//circle.setCenterAndRadius(circleCenter,circleRadius);
		var circlefeat = new Feature();
		circlefeat.setStyle(new Style({
   			fill: new Fill({
      			color: 'rgba(255,255,0,0.5)'
    			}),
    			stroke: new Stroke({
      			color: 'yellow',
      			width: 7
    			})
  		}));
  		circlefeat.setGeometry(circle);
		source.addFeature(circlefeat);
		return circlefeat;
	}
	else return;
}

document.getElementById("drawline").onclick = function(){
	selectLineStringElement();
}

document.getElementById("drawpoly").onclick = function(){
	selectPolygonElement();
}

document.getElementById("drawcircle").onclick = function(){
	selectCircleElement();
}

function selectPolygonElement(){
	openPoly();
	if (typeSelect.value =="Polygon") {
		typeSelect.value ="None";
		typeSelect.onchange();
		return;
	}
	typeSelect.value = "Polygon";
	typeSelect.onchange();
}

function selectLineStringElement(){
	openLinestringColor();
	if (typeSelect.value =="LineString") {
		typeSelect.value ="None";
		typeSelect.onchange();
		return;
	}

	typeSelect.value = "LineString";
	typeSelect.onchange();
}

function selectCircleElement(){
	openCircle();
	if (typeSelect.value =="Circle") {
		typeSelect.value ="None";
		typeSelect.onchange();
		return;
	}
	typeSelect.value = "Circle";
	typeSelect.onchange();
}

function selectErase(){
	if (selectElement.value == "remove"){
		selectElement.value = "none";
		selectElement.onchange();
		document.getElementById("erase").style.backgroundColor = defaultbackgroundColor;
		return;
	}
	else{
	selectElement.value="remove";
	selectElement.onchange();
	document.getElementById("erase").style.backgroundColor = selectedbackgroundColor;
	document.getElementById("drawcircle").style.backgroundColor = defaultbackgroundColor;
	document.getElementById("drawpoly").style.backgroundColor = defaultbackgroundColor;
	document.getElementById("drawline").style.backgroundColor = defaultbackgroundColor;
	trueStroke.style.display="none";
	trueFill.style.display="none";
}
}


//resolution.onchange = function(){
//	debugger;
//	changeResolution();
//}
//resolution.addEventListener("change",changeResolution);

//--------------KÄYTTÖLIITTYMÄN SKRIPTIT TÄSTÄ ALASPÄIN-----------------

var defaultbackgroundColor = "#333";
var selectedbackgroundColor = "#01ff00";


//Yläpalkin päivitya
var tbAccuracy;
var tbTeam = "tbTeam";
var tbUser = "tbUser";
var tbRoom = "tbRoom";

function updateTopBar(){
	var title = document.getElementById("title");
	var subtitle = document.getElementById("debuginfo");
	title.textContent = "Team: " + tbTeam
	subtitle.textContent = "User: " + tbUser + " | Room: " + tbRoom + " | Acc: " + tbAccuracy;
}


//hampurilaisvalikon avaus/sulku
document.getElementById("links").style.display = "none"; //hampurilaisvalikko kiinni alussa
document.getElementById("hamburger").addEventListener("click", openHamburger);

function openHamburger(){
	var x = document.getElementById("links");
	if (x.style.display === "block") {
		x.style.zIndex = "auto";
		x.style.display = "none";
  } else {
		x.style.zIndex = "1";
		x.style.display = "block";
  }
}

//Työkalupalkin avaus/sulku
document.getElementById("drawtools").style.display = "none"; //piirtotyökalut kiinni alussa
document.getElementById("toolstoggle").addEventListener("click", openTools)

function openTools(){
	openHamburger();
	var x = document.getElementById("drawtools");
	if (x.style.display === "flex") {
		x.style.display = "none";
		colorpickers.style.display = "inline-block"
		typeSelect.value ="None";
  } else {
		x.style.display = "flex";
		colorpickers.style.display = "block"
  }
}

document.getElementById("clearAll").addEventListener("click",clearAll);

function changePaletteColor(){
document.getElementById("fillColorPalette").style.backgroundColor = "rgb("+fillRed.value+", "+ fillGreen.value+", "+ fillBlue.value+")";
document.getElementById("strokeColorPalette").style.backgroundColor = "rgb("+strokeRed.value+", "+ strokeGreen.value+", "+ strokeBlue.value+")";	
}
var colorpickers = document.getElementById("colorpickers");
var trueFill = document.getElementById("color-picker-container");
trueFill.style.display = "none";
var trueStroke = document.getElementById("color-picker-stroke");
trueStroke.style.display = "none";
var colorElements = document.querySelectorAll('[name="colorChange"]');
for (var i = 0; i < colorElements.length; i++) {
  colorElements[i].addEventListener('change', changePaletteColor);
}
document.getElementById("strokeColorPalette").style.display = "none";
document.getElementById("fillColorPalette").style.display = "none";

document.getElementById("strokeColorPalette").style.backgroundColor = "rgb("+strokeRed.value+", "+ strokeGreen.value+", "+ strokeBlue.value+")";
document.getElementById("fillColorPalette").style.backgroundColor = "rgb("+fillRed.value+", "+ fillGreen.value+", "+ fillBlue.value+")";
//työkalupalkin tapahtumankuuntelijat
//document.getElementById("drawline").addEventListener("click", );
//document.getElementById("drawpoly").addEventListener("click", );
//document.getElementById("drawcircle").addEventListener("click", );
document.getElementById("erase").addEventListener("click", selectErase);

//debug menun avaus/sulku
document.getElementById("debugmenu").style.display = "none";
document.getElementById("settings").addEventListener("click", openDebugmenu)

function openDebugmenu(){
	openHamburger();
	var x = document.getElementById("debugmenu");
	if (x.style.display === "block") {
		x.style.display = "none";
  } else {
		x.style.display = "block";
  }
}

function openLinestringColor(){
	if (typeSelect.value == "LineString") {
		document.getElementById("drawline").style.backgroundColor = defaultbackgroundColor;
		trueStroke.style.display = "none";


  } else {
		document.getElementById("drawcircle").style.backgroundColor = defaultbackgroundColor;
		document.getElementById("drawpoly").style.backgroundColor = defaultbackgroundColor;
		document.getElementById("drawline").style.backgroundColor = selectedbackgroundColor;
		document.getElementById("erase").style.backgroundColor = defaultbackgroundColor;
		trueStroke.style.display = "inline-block";
		trueFill.style.display = "none";
		colorPickerStroke.resize(150);
  }
}


document.getElementById("linestringSettings").style.display = "none";
document.getElementById("PolyCircleSettings").style.display = "none";

function openPoly(){
	
	if (typeSelect.value == "Polygon") {
		document.getElementById("drawpoly").style.backgroundColor = defaultbackgroundColor;
		colorPicker.resize(1);
		trueFill.style.display = "none";
		trueStroke.style.display = "none";

  } else {
		document.getElementById("drawpoly").style.backgroundColor = selectedbackgroundColor;
		document.getElementById("drawline").style.backgroundColor = defaultbackgroundColor;
		document.getElementById("drawcircle").style.backgroundColor = defaultbackgroundColor;
		document.getElementById("erase").style.backgroundColor = defaultbackgroundColor;
		trueFill.style.display = "inline-block";
		colorPicker.resize(150);
		trueStroke.style.display = "inline-block";
		colorPickerStroke.resize(150);
  }
}

function openCircle(){
	if (typeSelect.value == "Circle") {
		document.getElementById("drawcircle").style.backgroundColor = defaultbackgroundColor;
		colorPicker.resize(1);
		trueStroke.style.display = "none";
		trueFill.style.display = "none";
		trueStroke.style.display = "none";
  } else {
		document.getElementById("drawcircle").style.backgroundColor = selectedbackgroundColor;
		document.getElementById("drawpoly").style.backgroundColor = defaultbackgroundColor;
		document.getElementById("drawline").style.backgroundColor = defaultbackgroundColor;
		document.getElementById("erase").style.backgroundColor = defaultbackgroundColor;
		colorPicker.resize(150);
		colorPickerStroke.resize(150);
		trueStroke.style.display = "inline-block";
		trueFill.style.display = "inline-block";
  }
}


//Chat ikkunan avaus/sulku
document.getElementById("chatwindow").style.display = "none";
document.getElementById("chattoggle").addEventListener("click", openChat);
document.getElementById("chatminimize").addEventListener("click", chatMinimize);

var sendButton = document.getElementById("messagesendbutton");
sendButton.onclick = textBoxClick;
 
function addToChatFromServer(msg) {	/** TODO **/
	var s = msg.getSenderid();
	var m = msg.getMsg();
	addToChat(s, m, "#96e27d", "Group");
}
 
wsh.addChatMessageListener(addToChatFromServer);

function textBoxClick(e) {
	e.preventDefault();
	var user = window.sessionStorage.getItem("username");
	if (user == undefined) return;
	var textbox = document.getElementById("messagefield");
	var bytes = textbox.value;
	wsh.sendChatMessage(bytes);
	textbox.value = "";
}
 
function openChat(){
	openHamburger();
	document.getElementById("minimizeicon").innerHTML = " &#9650 &#9650 &#9650 &#9650 ";
	var x = document.getElementById("chatwindow");
	var y = document.getElementById("messages");

	y.style.display = "none";
	
	var i;
	for (i = 0; i < 25; i++) {
	  addToChat2("käyttäjä2", i, "#96e27d");
	}
	addToChat("user", "testiviesti", "#96e27d", "user", "Group");
	addToChat2("käyttäjä2", "testiviesti", "#96e27d");
	if (x.style.display === "block") {
		x.style.display = "none";
		colorpickers.style.bottom = "21px";
  } else {
		x.style.display = "block";
		colorpickers.style.bottom = "85px";
  }
}

function chatMinimize(){
	var x = document.getElementById("messages");
	if (x.style.display === "block") {
		x.style.display = "none";
		document.getElementById("minimizeicon").innerHTML = " &#9650 &#9650 &#9650 &#9650 ";
  } else {
		x.style.display = "block";
		document.getElementById("minimizeicon").innerHTML = " &#9660 &#9660 &#9660 &#9660 ";
  }
}

//lisää viestin chattiin
function addToChat(sender, messagetext, color, chat){
	var x = document.getElementById("messages");
	var message = document.createElement("li");
	message.textContent = sender + ": " + messagetext;
	message.className = "chatmessage";
	if (sender == "user"){
		message.style = "background-color: " + color + ";";
	}
	x.appendChild(message);
	x.scrollTop = x.scrollHeight; //MUISTA TÄMÄ
}

function addToChat2(sender, messagetext, color){
	var x = document.getElementById("messages");
	var message = document.createElement("li");
	message.textContent = sender + ": " + messagetext;
	message.className = "chatmessage";
	x.appendChild(message);
}



//TODO: funktio joka hakee käyttäjän tämänhetkisen joukkueen nimen
function teamName(){
	name = "";
	document.getElementById("title").textContent = "Team: " + name;
}

//login ikkunan avaus/sulku
document.getElementById("flexLR").style.display = "block";
document.getElementById("teamSelect").style.display = "none";
document.getElementById("roomwindow").style.display = "none";
document.getElementById("loginButton").addEventListener("click", handleLogin)
document.getElementById("selectusername").addEventListener("click", openLogin)

function openLogin(){
	openHamburger();
	document.getElementById("roomwindow").style.display = "none";
	document.getElementById("loginwindow").style.display = "block";
	document.getElementById("teamSelect").style.display = "none";
	applyMapCover();
}

function handleLogin(e){
	var username = document.getElementById("usernameInput").value;
	var key = window.sessionStorage.getItem("key");
	wsh.login(username, key);
	
	//---- ensin huoneeseen liittyminen, sitten sijainti palvelimelle
	wsh.joinRoom("testi");
	sendPositionDataToServer();
	//----
	
	removeMapCover();
}
	
function onLogin(msg) {
	window.sessionStorage.setItem("username", msg.getUsername());
	window.sessionStorage.setItem("key", msg.getKey());
	tbUser = msg.getUsername();
	updateTopBar();
}

wsh.addLoginResultListener(onLogin);


//huoneenvalintaikkunan avaus/sulku
document.getElementById("openroomlogin").addEventListener("click", openRoomLogin)

function openRoomLogin(){
	var roomLoginButton = document.getElementById("roomLoginButton");
	var exitRoomLogin = document.getElementById("exitRoomLogin");
	var checkbox = document.querySelector("input[name=createroomToggle]");
	
	openHamburger();
	document.getElementById("loginwindow").style.display = "none";
	document.getElementById("roomwindow").style.display = "block";
	document.getElementById("teamSelect").style.display = "none";
	applyMapCover();
	
	checkbox.addEventListener( 'change', function() {
		if(this.checked) {
			roomLoginButton.textContent = "Luo huone"
		} else {
			roomLoginButton.textContent = "Liity"
		}
	});
	
	roomLoginButton.onclick = handleRoomLogin;
	exitRoomLogin.onclick = removeMapCover;
}

function handleRoomLogin(e){//kutsutaan kun login nappia painetaan
		var roomname = document.getElementById("roomnameInput").value;
		var roompass = document.getElementById("passwordInput").value;
		var createroom = document.getElementById("createroomToggle").checked;
		wsh.joinRoom(roomname, roompass, createroom);
		tbRoom = roomname;
		updateTopBar();
	}

//ryhmänvalintaikkunan avaus/sulku
document.getElementById("openteams").addEventListener("click", openTeamList)

function openTeamList(){
	var exitTeamWindow = document.getElementById("exitTeamWindow");
	var editTeams = document.getElementById("teamEditButton");
	
	openHamburger();
	document.getElementById("roomwindow").style.display = "none";
	document.getElementById("loginwindow").style.display = "none";
	document.getElementById("teamSelect").style.display = "flex";
	applyMapCover();
	fetchTeamNames();
	
	var z = document.getElementById("modelTeamElement");
	z.style.display = "none";
	var x = document.getElementsByClassName("teamButton");
	for (var i = 0; i < x.length; i++) {
		x[i].style.display = "block";
	}
	
	exitTeamWindow.onclick = removeMapCover;
	editTeams.onclick = toggleTeamEdit;
	
	function toggleTeamEdit(){
		var y = document.getElementsByClassName("delteamButton");
		if (x[0].style.display === "block") {
			z.style.display = "block";
			for (var i = 0; i < x.length; i++) {
				x[i].style.display = "none";
				y[i].style.display = "block";
			}
		} else {
			z.style.display = "none";
			for (var i = 0; i < x.length; i++) {
				x[i].style.display = "block";
				y[i].style.display = "none";
			}
		}
	}
	
	function fetchTeamNames(){
		var teamlist = document.getElementById("teamlist");
		teamlist.innerHTML = '';
		for (var key in grouplist){
			var teamelement = document.createElement("div");
			teamelement.className = "teamlistElement";
			teamelement.id = "teamElement" + key;
			teamelement.textContent = grouplist[key];
			var teambutton = document.createElement("button");
			teambutton.className = "teamButton";
			teambutton.id = "teamButton" + key;
			teambutton.textContent = "Liity";
			var delteambutton = document.createElement("button");
			delteambutton.className = "delteamButton";
			delteambutton.id = "delteamButton" + key;
			delteambutton.textContent = "Poista";
			delteambutton.style.display = "none";
			
			teamelement.appendChild(teambutton);
			teamelement.appendChild(delteambutton);
			teamlist.appendChild(teamelement);
		}
	}
}




function applyMapCover(){
	var x = document.getElementById("flexLR");
	if (x.style.display === "none") {
		x.style.display = "block";
	}
}
function removeMapCover(){
	var x = document.getElementById("flexLR");
	if (x.style.display === "block") {
		x.style.display = "none";
	}
}
/*
var x = document.getElementById("flexLR");
	if (x.style.display === "block") {
		x.style.display = "none";
  } else {
		x.style.display = "block";
  }
*/

var colorPickerStroke = new iro.ColorPicker("#color-picker-stroke",{
	width: 1,
	color: "#f00",
	});

var colorPicker = new iro.ColorPicker('#color-picker-container',{
	width: 1,
	color: "#f00",
	});

function onColorChange(color,changes){
	var col = color.rgba;
	PickerFillred = col["r"];
	PickerFillgreen = col["g"];
	PickerFillBlue = col["b"];
}
function onColorChangeStroke(color,changes){
	var col = color.rgba;
	PickerStrokered = col["r"];
	PickerStrokegreen = col["g"];
	PickerStrokeBlue = col["b"];
}

colorPicker.on("color:change",onColorChange);
colorPickerStroke.on("color:change",onColorChangeStroke);
