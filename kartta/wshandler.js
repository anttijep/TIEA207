var types = require('./testprotocol_pb');
export class WSHandler {
	constructor(hostname) {
		this.ws = new WebSocket(hostname);
		this.ws.binaryType = "arraybuffer";
		this.onChatMessage = new Set();
		this.onLocationChange = new Set();
		this.onReceiveDrawing = new Set();
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

	sendDrawing(type, array) {
		var msg = new proto.testi.ToServer();
		
		var shape = new proto.testi.DrawShape();
		array.forEach(e=>{
			var point = new proto.testi.DrawPoint();
			point.setLongitude(e[0]);
			point.setLatitude(e[1]);
			shape.getPointsList().push(point);
		});
		shape.setType(0);
		msg.setShape(shape);
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
		msg.getChatmsgList().forEach(e=>that.onChatMessage.forEach(f=>f(e)));
		msg.getLocationsList().forEach(e=>that.onLocationChange.forEach(f=>f(e)));
		msg.getShapesList().forEach(e=>that.onReceiveDrawing.forEach(f=>f(e)));
	}
	addLocationChangeListener(func) {
		this.onLocationChange.add(func);
	}
	removeLocationChangeListener(func) {
		this.onLocationChange.delete(func);
	}
	addReceiveDrawingListener(func) {
		this.onReceiveDrawing.add(func);
	}
	removeReceiveDrawingListener(func) {
		this.onReceiveDrawing.delete(func);
	}
	addChatMessageListener(func) {
		this.onChatMessage.add(func);
	}
	removeChatMessageListener(func) {
		this.onChatMessage.delete(func);
	}
}

