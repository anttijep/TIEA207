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

	sendCircle(center, radius) {

		var circle = new proto.testi.Circle();
		var point = new proto.testi.DrawPoint();
		point.setLongitude(center[0]);
		point.setLatitude(center[1]);
		circle.setCenter(point);
		circle.setRadius(radius);
		var shape = new proto.testi.DrawShape();
		shape.getCirclesList().push(circle);
		var msg = new proto.testi.ToServer();
		msg.setShape(shape);
		this.ws.send(msg.serializeBinary());
	}

	sendPolygon(poly) {
		var polygon = new testi.proto.Polygon();
		poly.forEach(arr=>{
			var points = new proto.testi.PointArray();
			arr.forEach(p=>{
				var point = new proto.testi.DrawPoint();
				point.setLongitude(p[0]);
				point.setLongitude(p[1]);
				points.getPointsList().push(point);
			});
			polygon.getPointarray().push(points);
		});
		var msg = new proto.testi.ToServer();
		var shape = new proto.testi.DrawShape();
		shape.getPolysList().push(polygon);
		msg.setShape(shape);
		this.ws.send(msg.serializeBinary());
	}

	sendLinestring(array) {
		var msg = new proto.testi.ToServer();
		var shape = new proto.testi.DrawShape();
		var points = new proto.testi.PointArray();
		array.forEach(e=>{
			var point = new proto.testi.DrawPoint();
			point.setLongitude(e[0]);
			point.setLatitude(e[1]);
			points.getPointsList().push(point);
		});
		shape.getLinestringsList().push(points);
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

