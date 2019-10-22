
var types = require('./Testprotocol_pb');
var ws = new WebSocket("ws://127.0.0.1:5678/");
ws.binaryType = 'arraybuffer';

var messages = document.createElement('ul');
ws.binaryType = 'arraybuffer';
document.getElementById('sendbutton').onclick = textboxClick;
var textbox = document.getElementById('textbox');

ws.onmessage = function (event) {
    console.debug("WebSocket message received:", event);
    var messages = document.getElementsByTagName('ul')[0];
    var message = document.createElement('li');
    var bytes = proto.testi.Chatmessage.deserializeBinary(event.data);
    message.appendChild(document.createTextNode(bytes));
    messages.appendChild(message);
};

function textboxClick() {
    //var bytes = proto.testi.Chatmessage.prototype.serializeBinary(textbox.value);
    var bytes = textbox.value;
    ws.send(bytes);
}
document.body.appendChild(messages);