var types = require('./testprotocol_pb');
export class WSHandler {
	constructor(hostname) {
		this.ws = new WebSocket(hostname);
		this.ws.binaryType = "arraybuffer";
		this.onChatMessage = new Set();
		this.onLocationChange = new Set();
		var me = this;

		this.ws.onmessage = function(evnt) {
			me.onMessage(evnt)};
	}

	sendLocation(lat, lon) {
		var msg = new proto.testi.ToServer();
		var loc = new proto.testi.Location();
		loc.setLatitude(lat);
		loc.setLongitude(lon);
		msg.setLocation(loc);
		this.ws.send(msg.serializeBinary());
	}

	sendChatMessage(msg) {
		var resp = new proto.testi.ToServer();
		resp.setChatmsg(msg);
		this.ws.send(resp.serializeBinary());
	}
	onMessage(evnt) {
		var msg = proto.testi.FromServer.deserializeBinary(evnt.data);
		var that = this;
		msg.getChatmsgList().forEach(function(chatmsg){
			that.onChatMessage.forEach(function(func) { func(chatmsg)});
		});
		msg.getLocationsList().forEach(function(location) {
			that.onLocationChange.forEach(function(func) { func(location)});
		});
	}
	addLocationChangeListener(func) {
		this.onLocationChange.add(func);
	}
	removeLocationChangeListener(func) {
		this.onLocationChange.delete(func);
	}

	addChatMessageListener(func) {
		this.onChatMessage.add(func);
	}
	removeChatMessageListener(func) {
		this.onChatMessage.delete(func);
	}

}