 
var hostname = "127.0.0.1:5678"

var types = require('./testprotocol_pb');
var ws = new WebSocket(hostname);
ws.binaryType = 'arraybuffer';

var messages = document.createElement('ul');
ws.binaryType = 'arraybuffer';

var sendbutton = document.getElementById('sendbutton');
sendbutton.onclick = textboxClick;

var textbox = document.getElementById('textbox');
textbox.addEventListener("keyup", function(evnt) {
	evnt.preventDefault();
	if (evnt.keyCode === 13) { 
		sendbutton.click(); 
	}
	return false;
});

ws.onmessage = function (event) {
    console.debug("WebSocket message received:", event);
    var messages = document.getElementsByTagName('ul')[0];
    var message = document.createElement('li');
    var bytes = proto.testi.Chatmessage.deserializeBinary(event.data);
    message.appendChild(document.createTextNode(bytes));
    messages.appendChild(message);
};

function textboxClick(evnt) {
    //var bytes = proto.testi.Chatmessage.prototype.serializeBinary(textbox.value);
    var bytes = textbox.value;
    ws.send(bytes);
	evnt.preventDefault();
}
document.body.appendChild(messages);
