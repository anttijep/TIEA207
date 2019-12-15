import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import TileLayer from 'ol/layer/Tile';
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

var grouplist = {};
var userslist = {};
function onNewGroup(msg){
	var id = msg.getId();
	grouplist[id] = msg.getName();
}

wsh.addNewGroupListener(onNewGroup);

var mapLayers = {};

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
  }),
  zIndex: 8
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
			minZoom: 6,
			maxZoom:18
		});

var scales = [];
var lastLocationUpdate = Date.now();

var geolocation = new Geolocation({
  trackingOptions: {
    enableHighAccuracy: true
  },
  projection: view.getProjection()
});

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
		tbAccuracy = geolocation.getAccuracy();
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
	if (msg.getSenderid() === myId) return;
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

// käyttäjän siirtyminen ryhmästä toiseen ja disconnectaamisen händläys?
function userMove(msg) {
	if (msg.getDisconnected() == true) {
		var uid = msg.getUserid();
		markerLayer.remove(markerDict[uid]);
		delete markerDict.uid;
	}

	if (msg.getName() !== "") {
		userslist[msg.getUserid()] = msg.getName();
	}
}
wsh.addUserMovedListener(userMove);


fetch(capabilitiesUrl).then(function(response) {
	return response.text();
}).then(function(text) {
	var parser = new WMTSCapabilities();
	var result = parser.read(text);
	result.Contents.Layer.forEach(e=> {
		var ident = e.Identifier;
//		if (ident === "kiinteistojaotus" || ident === "kiinteistotunnukset")
//			return;
		var options = optionsFromCapabilities(result, {
			layer: ident,
			matrixSet: 'EPSG:3067'
		});
		var tl = new TileLayer({
			opacity: 1,
			source: new WMTS(options),
			zIndex: 0
		})
		map.addLayer(tl);
		tl.setVisible(false);
		mapLayers[ident] = tl;
	});
	mapLayers["maastokartta"].setVisible(true);
	scales = result.Contents.TileMatrixSet[1].TileMatrix;	// xml:stä saadut arvot (EPSG:3067)

	map.removeLayer(vector);
  	map.addLayer(vector);
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
  	selectSingleclick = new Select();
    select = selectSingleclick
  }
  else {
    select = null;
  }
  if (select !== null) {
    map.addInteraction(select);
    select.on('select', function(e) {
		if (selectSingleclick.getLayer(e.selected[0]) == vector && vector != undefined){
			wsh.sendDeleteDrawing(e.selected[0].getId());
			//source.removeFeature(e.selected[0]);
			//selectSingleclick.getFeatures().clear();
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
  var feats = source.getFeatures();
  var idarray = [];
  for(var i = 0; i<feats.length;i++){
  	idarray.push(feats[i].getId());
  }
  wsh.sendDeleteDrawing(idarray);
  //vectorLayerSource.clear();
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

function setDrawingVisibility(){
	if (vector.getVisible() == true) vector.setVisible(false);
	else vector.setVisible(true);
}


function setAccuracyVisibility(){
	var layers = map.getLayers().getArray();
	for(var i = 0; i<layers.length;i++){
		if(layers[i].getZIndex() == 4 && layers[i].getVisible()== true) layers[i].setVisible(false);
		else if(layers[i].getZIndex() == 4 && layers[i].getVisible()== false) layers[i].setVisible(true);
	}
}


document.getElementById("hideAll").onclick = function(){
	setDrawingVisibility();
}

document.getElementById("hideAccuracy").onclick = function(){
	setAccuracyVisibility();
}

var PickerFillred = 240;
var PickerFillgreen = 255;
var PickerFillBlue = 255;
var	PickerStrokered = 0;
var	PickerStrokegreen = 0;
var	PickerStrokeBlue = 0;

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
	var center = transform([circle.getCenter().getLongitude(),circle.getCenter().getLatitude()],"EPSG:4326","EPSG:3067");
	var radius = circle.getRadius();
	var fillColorInt = circle.getFill().getColor();
	var fillColor = intToRgba(fillColorInt);
	var strokeColorInt = circle.getStroke().getColor();
	var strokeColor = intToRgba(strokeColorInt);
	var width = circle.getStroke().getWidth();
	var id = circle.getId();
	var circlenew = new CircleGeom(center,radius);
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
  		circlefeat.setId(id);
  		circlefeat.setGeometry(circlenew);
		source.addFeature(circlefeat);
}

function handleLinestring(linestring){
	var linestringCoord = [];
	linestring.getPointarray().getPointsList().forEach(coord=>transformLinestring(coord,linestringCoord))
	var strokeColorInt = linestring.getStroke().getColor();
	var width = linestring.getStroke().getWidth();
	var strokeColor = intToRgba(strokeColorInt);
	var id = linestring.getId();
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
	linefeat.setId(id);

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
    var id = polygon.getId();
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
	polyfeat.setId(id);
	source.addFeature(polyfeat);
}



function transformLinestring(coord,array){
	array.push(transform([coord.getLongitude(),coord.getLatitude()],"EPSG:4326","EPSG:3067"));
}



function drawReceivedDrawing(msg) {
	msg.getLinestringsList().forEach(lstrings=> handleLinestring(lstrings));
	msg.getCirclesList().forEach(circle =>handleCircle(circle));
    msg.getPolysList().forEach(poly=>handlePolygon(poly));
    
    msg.getDeleteidsList().forEach(id=>deleteDrawFeature(id));

}


function deleteDrawFeature(id){
	var feats = source.getFeatures();
	for(var i = 0; i<feats.length; i++){
		if(feats[i].getId() == id){
			source.removeFeature(feats[i]);
			return;
		}
	}
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


//Yläpalkin päivitys
var tbAccuracy;
var tbTeam = "unassigned";
var tbUser = "tbUser";
var tbRoom = "tbRoom";

function updateTopBar(){
	var title = document.getElementById("title");
	var subtitle = document.getElementById("debuginfo");
	title.textContent = "Ryhmä: " + tbTeam
	subtitle.textContent = "Käyttäjä: " + tbUser + " | Huone: " + tbRoom + " | Tarkkuus.: " + tbAccuracy + "m";
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
	removeMapCover();
	openHamburger();
	var x = document.getElementById("drawtools");
	if (x.style.display === "flex") {
		x.style.display = "none";
		colorpickers.style.display = "None"
		typeSelect.value ="None";
		trueFill.style.display = "none";
		trueStroke.style.display = "none";
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

document.getElementById("sendmessage").onsubmit = function (e) {
	e.preventDefault();
	textBoxClick(e);
};

var sendButton = document.getElementById("messagesendbutton");
sendButton.onclick = textBoxClick;
 
function addToChatFromServer(msg) {	/** TODO **/
	var s = userslist[msg.getSenderid()];
	var m = msg.getMsg();
	addToChat(s, m, "#96e27d", "Group");
}
 
wsh.addChatMessageListener(addToChatFromServer);

function textBoxClick(e) {
	e.preventDefault();
	var user = window.sessionStorage.getItem("username");
	if (user === undefined) return;
	var textbox = document.getElementById("messagefield");
	var bytes = textbox.value;
	wsh.sendChatMessage(bytes);
	textbox.value = "";
}
var chatminimized = false;
function openChat(){
	openHamburger();
	if (chatminimized == false){
		document.getElementById("minimizeicon").innerHTML = " &#9660 Pienennä chat &#9660 ";
	} else {
		document.getElementById("minimizeicon").innerHTML = " &#9650 Laajenna chat &#9650 ";
	}
	document.getElementById("minimizeicon").style.color = "#ffffff";
	var x = document.getElementById("chatwindow");
	var y = document.getElementById("messages");
	
	/*var i;
	for (i = 0; i < 25; i++) {
	  addToChat2("käyttäjä2", i, "#96e27d");
	}
	addToChat("user", "testiviesti", "#96e27d", "user", "Group");
	addToChat2("käyttäjä2", "testiviesti", "#96e27d"); */
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
	if (chatminimized == false) {
		x.style.maxHeight = "20px";
		chatminimized = true;
		document.getElementById("minimizeicon").innerHTML = " &#9650 Laajenna chat &#9650 ";
		x.scrollTop = x.scrollHeight;
  } else {
		x.style.maxHeight = "400px";
		chatminimized = false;
		document.getElementById("minimizeicon").innerHTML = " &#9660 Pienennä chat &#9660 ";
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
	x.scrollTop = x.scrollHeight; //MUISTA TÄMÄ - scrollaa viimeisimmän viestin näkyviin
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
document.getElementById("editmapdiv").style.display = "none";

document.getElementById("loginButton").addEventListener("click", handleLogin)
document.getElementById("selectusername").addEventListener("click", openLogin)
document.getElementById("usernameInput").focus();

function openLogin(){
	var loginButton = document.getElementById("loginButton");
	removeMapCover();
	openHamburger();
	document.getElementById("loginwindow").style.display = "block";
	applyMapCover();
}

function handleLogin(e){
	var username = document.getElementById("usernameInput").value;
	var key = window.sessionStorage.getItem("key");
	wsh.login(username, key);
	
	removeMapCover();
}
	
function onLogin(msg) {
	if (msg.getSuccess() === false) {
		/** TODO **/
		return;
	}
	wsh.joinRoom("testi");
	sendPositionDataToServer();
	window.sessionStorage.setItem("username", msg.getUsername());
	window.sessionStorage.setItem("key", msg.getKey());
	tbUser = msg.getUsername();
	updateTopBar();
	updateLicense();
}

wsh.addLoginResultListener(onLogin);


//huoneenvalintaikkunan avaus/sulku
document.getElementById("openroomlogin").addEventListener("click", function(e) {
	openRoomLogin();
	document.getElementById("roomnameInput").focus();
	});

function openRoomLogin(){
	var roomLoginButton = document.getElementById("roomLoginButton");
	var exitRoomLogin = document.getElementById("exitRoomLogin");
	var checkbox = document.querySelector("input[name=createroomToggle]");
	
	removeMapCover();
	openHamburger();
	document.getElementById("roomwindow").style.display = "block";
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

}

function handleJoinRoom(msg) {
  if (!msg.getSuccess())
      return;
  myId = msg.getId();
  markerLayer.clear();
  markerLayer.push(positionMarker);
  sendPositionDataToServer();
  tbRoom = msg.getRoomname();
  userDict = [];
  for (var marker in markerDict) {
    delete markerDict[marker];
  }
  positionMarker.setGeometry(myPosition ? new Point(myPosition) : null);
    
	tbRoom = msg.getRoomname();
	updateTopBar();
}
//document.getElementById("roomLoginButton").addEventListener("click",handleRoomLogin);
wsh.addJoinResultListener(handleJoinRoom);

function handleGroupLogin() {
	var groupId = parseInt(this.id.replace( /[^\d.]/g, '' ));
	wsh.joinGroup(groupId);
  console.log(teamlist);
  tbTeam = grouplist[groupId];
}

function handleGroupDelete() {
	var groupId = parseInt(this.id.replace( /[^\d.]/g, '' ));
  if (groupId == 0) { // unassignedia ei voi poistaa listasta
    return;
  }
	console.log("Poistetaan ryhmä " + groupId);
	delete grouplist[groupId];
	wsh.deleteGroup(groupId);
}

var roomDict = [];
var userDict = [];

function handleLoginResult(msg){
	if (window.sessionStorage.getItem("username") == undefined) return;
	if(msg.getCreateroom() == false){
		if (roomDict.includes([msg.getRoomname(),msg.getPassword()]))
				userDict[roomDict.indexOf(msg.getRoomname())].push([window.sessionStorage.getItem("username"),window.sessionStorage,getItem("key")]);		
		else {
			console.log("väärä salasana tai huonetta ei olemassa");
			return;
			}
		}
		else if (msg.getJoinroom().getCreateroom()==true){
		roomDict.push([msg.getRoomname(),msg.getPassword()]);
		userDict[roomDict.indexOf([msg.getRoomname(),msg.getPassword()])].push([window.sessionStorage.getItem("username"),window.sessionStorage,getItem("key")]);
	}
}

// kartan muokkaus ikkuna
document.getElementById("editmap").addEventListener("click", openEditMap);

function openEditMap() {
	removeMapCover();
	var cancel = document.getElementById("cancelEditButton");
	var accept = document.getElementById("acceptEditButton");
	cancel.onclick = removeMapCover;
	accept.onclick = onaccept;

	openHamburger();
	document.getElementById("editmapdiv").style.display = "flex";
	applyMapCover();

	var listtable = document.getElementById("maplist");
	listtable.innerHTML = '';

	var tr = document.createElement("tr");
	var th = document.createElement("th");
	th.appendChild(document.createTextNode("Name"));
	tr.appendChild(th);

	th = document.createElement("th");
	th.appendChild(document.createTextNode("opacity"));
	tr.appendChild(th);

	th = document.createElement("th");
	th.appendChild(document.createTextNode("z-index"));
	tr.appendChild(th);

	listtable.appendChild(tr);

	var keys = Object.keys(mapLayers);
	keys.sort();
	var cid = 0;
	keys.forEach(key=> {
		var tr = document.createElement("tr");
		var label = document.createElement("label");
		var option = document.createElement("input");
		var opacitybox = document.createElement("input");
		var zindexbox = document.createElement("input");

		option.type = "checkbox";
		option.className = "mapcboxes";
		option.value = key;
		option.checked = mapLayers[key].getVisible();
		option.id = "cb"+cid++;
		label.appendChild(document.createTextNode(key));
		label.htmlFor = option.id;

		var td = document.createElement("td");
		td.id = key;
		td.appendChild(option);
		td.appendChild(label);
		tr.appendChild(td);

		opacitybox.type = "number";
		opacitybox.className = "opacity";
		opacitybox.valueAsNumber = mapLayers[key].getOpacity();
		opacitybox.step = "0.1";
		opacitybox.max = "1";
		opacitybox.min = "0";
		var td = document.createElement("td");
		td.id = key;
		td.appendChild(opacitybox);
		tr.appendChild(td);

		zindexbox.type = "number";
		zindexbox.className = "zindex";
		zindexbox.valueAsNumber = mapLayers[key].getZIndex();
		zindexbox.min = "0";
		zindexbox.max = Number.MAX_SAFE_INTEGER;
		td = document.createElement("td");
		td.id = key;
		td.appendChild(zindexbox);
		tr.appendChild(td);
		listtable.appendChild(tr);
	});

	function onaccept() {
		var elements = listtable.getElementsByTagName("td");
		for (var elem of elements) {
			for (var child of elem.childNodes) {
				if (child.className === "mapcboxes") {
					mapLayers[elem.id].setVisible(child.checked);
				}
				else if (child.className === "opacity") {
					mapLayers[elem.id].setOpacity(child.valueAsNumber);
				}
				else if (child.className === "zindex") {
					mapLayers[elem.id].setZIndex(child.valueAsNumber);
				}
			}
		}
		removeMapCover();
	}
}

//ryhmänvalintaikkunan avaus/sulku
document.getElementById("openteams").addEventListener("click", openTeamList);

function openTeamList(){
	removeMapCover();
	var exitTeamWindow = document.getElementById("exitTeamWindow");
	var editTeams = document.getElementById("teamEditButton");
	
	openHamburger();
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
			teambutton.id = "teambutton" + key;
			teambutton.textContent = "Liity";
			teambutton.addEventListener ("click", handleGroupLogin);
			var delteambutton = document.createElement("button");
			delteambutton.className = "delteamButton";
			delteambutton.id = "delteamButton" + key;
			delteambutton.textContent = "Poista";
			delteambutton.style.display = "none";
			delteambutton.addEventListener ("click", handleGroupDelete);
			
			teamelement.appendChild(teambutton);
			teamelement.appendChild(delteambutton);
			teamlist.appendChild(teamelement);
		}
	}
}

var createTeamButton = document.getElementById("createTeamButton");
var newGroupName = document.getElementById("teamnameInput");
createTeamButton.addEventListener("click", function() {handleNewGroup(newGroupName.value)});

function handleNewGroup(name) {
	wsh.createGroup(name);
	newGroupName.value="";
	removeMapCover();
}

function applyMapCover(){
	var x = document.getElementById("flexLR");
	if (x.style.display === "none") {
		x.style.display = "block";
	}
}
function removeMapCover(){
	document.getElementById("roomwindow").style.display = "none";
	document.getElementById("loginwindow").style.display = "none";
	document.getElementById("teamSelect").style.display = "none";
	document.getElementById("editmapdiv").style.display = "none";
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
	color: "#000000",
	});

var colorPicker = new iro.ColorPicker('#color-picker-container',{
	width: 1,
	color: "#f0ffff",
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

var license = document.getElementById("licenseinfo")
function updateLicense(){
	var pvm = new Date();
	var y = pvm.getYear() + 1900;
	var m = pvm.getMonth() + 1;
	license.textContent = "Sisältää Maanmittauslaitoksen Maastotietokannan " + m + "/" + y + " aineistoa"
}



