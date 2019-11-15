
import { WSHandler } from "../kartta/wshandler";
var hostname = "ws://127.0.0.1:5678"

//var wshandler = require('./wshandler');
var wsh = new WSHandler(hostname);

// esim. chat eventtien lukeminen
var messageselement = document.getElementById('chattesti');
function test(msg) {
	var message = document.createElement('li');
	message.appendChild(document.createTextNode(msg.getSenderid() + ": " + msg.getMsg()));
	messageselement.appendChild(message);
}
wsh.addChatMessageListener(test);
//wsh.removeChatMessageListener(test);
// esim. end

// esim2. location lukeminen
function test2(msg) {
	var message = document.createElement('li');
	var s = msg.getSenderid() + ": " + msg.getLatitude()+ ", " + msg.getLongitude();
	message.appendChild(document.createTextNode(s));
	messageselement.appendChild(message);
}
wsh.addLocationChangeListener(test2);
// esim2. end

function handleCircle(circle,arr){
	arr.push([circle.getCenter().getLatitude(),circle.getCenter().getLatitude(),circle.getRadius()])
}


// esim3. piirrustuksen lukeminen
function test3(msg) {
	var message = document.createElement('li');
	var arr = [];
	msg.getLinestringsList().forEach(lstrings=>lstrings.getPointsList().forEach(e=>arr.push([e.getLongitude(), e.getLatitude()])));
	msg.getCirclesList().forEach(circle =>handleCircle(circle,arr));
	var s = msg.getSenderid() + " :: " + arr.join("->");
	message.appendChild(document.createTextNode(s));
	messageselement.appendChild(message);
}
wsh.addReceiveDrawingListener(test3);

var messages = document.createElement('ul');


var sendbutton = document.getElementById('sendbutton');
sendbutton.onclick = textboxClick;

var sendposbutton = document.getElementById("sendpos");
sendposbutton.onclick = sendposition;

var senddrawbutton = document.getElementById("senddraw");
senddrawbutton.onclick = senddrawing;

var latbox = document.getElementById('latitude');
var longbox = document.getElementById("longitude");
function sendposition(evnt) {
	var lat = parseFloat(latbox.value); 
	var lon = parseFloat(longbox.value); 
	wsh.sendLocation(lat, lon);
	evnt.preventDefault();
}

function senddrawing(evnt) {
	var arr = [[24.944,60.167],[25.7495, 62.242],[28.188,61.059]];
	wsh.sendLinestring(arr);
}


var textbox = document.getElementById('textbox');
textbox.addEventListener("keyup", function(evnt) {
	evnt.preventDefault();
	if (evnt.keyCode === 13) { 
		sendbutton.click(); 
	}
	return false;
});


function textboxClick(evnt) {
    //var bytes = proto.testi.Chatmessage.prototype.serializeBinary(textbox.value);
    var bytes = textbox.value;
    wsh.sendChatMessage(bytes);
	evnt.preventDefault();
}
document.body.appendChild(messages);

