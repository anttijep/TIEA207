
import { WSHandler } from "../kartta/wshandler";
var hostname = "ws://127.0.0.1:5678"

//var wshandler = require('./wshandler');
var wsh = new WSHandler("ws://127.0.0.1:5678");

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

var messages = document.createElement('ul');


var sendbutton = document.getElementById('sendbutton');
sendbutton.onclick = textboxClick;

var sendposbutton = document.getElementById("sendpos");
sendposbutton.onclick = sendposition;

var latbox = document.getElementById('latitude');
var longbox = document.getElementById("longitude");
function sendposition(evnt) {
	var lat = parseFloat(latbox.value); 
	var lon = parseFloat(longbox.value); 
	wsh.sendLocation(lat, lon);
	evnt.preventDefault();
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
