
import { WSHandler } from "../kartta/wshandler";
var hostname = "ws://127.0.0.1:5678";

var wsh = new WSHandler(hostname);


// esim. Login & join room

var logindiv = document.getElementById("logindiv");
var chatdiv = document.getElementById("chatdiv");
var usekeybox = document.getElementById("usekey");
var sendloginbutton = document.getElementById("sendlogin");
var unamebox = document.getElementById("unamebox");

chatdiv.style.display = "none";

sendloginbutton.onclick = sendLogin;

function sendLogin(e) {
	var key = "";
	if (usekeybox.checked && sessionStorage.userkey) {
		key = sessionStorage.userkey;
	}
	wsh.login(unamebox.value, key);
	e.preventDefault();
}
function joinRoom(e) {
	wsh.joinRoom(unamebox.value);
	e.preventDefault();
}

function loginresult(result) {
	if (result.getSuccess()) {
		if (usekeybox.checked) {
			sessionStorage.userkey = result.getKey();
		}
		unamebox.value = "";
		sendloginbutton.onclick = joinRoom;
	}
	else if (result.getErrmsg() !== "") {
		document.getElementById("errmsg").textContent = result.getErrmsg();
	}
	else {
		document.getElementById("errmsg").textContent = "Login failed without error message";
	}

}

function joinresult(result) {
	if (result.getSuccess()) {
		logindiv.style.display = "none";
		chatdiv.style.display = "block";
		var messageselement = document.getElementById('chattesti');
		var message = document.createElement('li');
		message.appendChild(document.createTextNode("Joined.. my id: " + result.getId()));
		messageselement.appendChild(message);
	}
	else if (result.getErrmsg() !== "") {
		document.getElementById("errmsg").textContent = result.getErrmsg();
	}
	else {
		document.getElementById("errmsg").textContent = "Join failed without error message";
	}
}
wsh.addJoinResultListener(joinresult);
wsh.addLoginResultListener(loginresult);

// esim. login&join END

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
	var s = msg.getSenderid() + ": " + msg.getLatitude()+ ", " + msg.getLongitude() + ", " + msg.getAccuracy();
	message.appendChild(document.createTextNode(s));
	messageselement.appendChild(message);
}
wsh.addLocationChangeListener(test2);
// esim2. end
// join group

function userMoved(msg) {
	var message = document.createElement('li');
	var s = msg.getUserid() + " moved to " + msg.getGroupid();
	message.appendChild(document.createTextNode(s));
	messageselement.appendChild(message);
}
wsh.addUserMovedListener(userMoved);

function handleCircle(circle,arr){
	arr.push([circle.getCenter().getLatitude(),circle.getCenter().getLatitude(),circle.getRadius()])
}


// esim3. piirrustuksen lukeminen
function test3(msg) {
	var message = document.createElement('li');
	var arr = [];

	var id = -1;
	msg.getLinestringsList().forEach(lstrings=>{
		lstrings.getPointarray().getPointsList().forEach(e=>arr.push([e.getLongitude(), e.getLatitude()]))
		id = lstrings.getId();
	});
	var s = msg.getSenderid() + " :: " + id + " :: " + arr.join("->");

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
	wsh.sendLocation(lat, lon, 25);
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

