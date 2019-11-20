var types = require('./testprotocol_pb');
export class WSHandler {
	constructor(hostname, open = null, error = null) {
		this.ws = new WebSocket(hostname);
		this.ws.binaryType = "arraybuffer";
		this.onChatMessage = new Set();
		this.onLocationChange = new Set();
		this.onReceiveDrawing = new Set();

		this.onLoginResult = new Set();
		this.onJoinResult = new Set();
		this.onNewGroup = new Set();
		this.onUserMoved = new Set();
		var me = this;

		this.ws.onmessage = function(evnt) {
			me.onMessage(evnt)};
		if (open !== null)
			this.ws.onopen = open;
		if (error !== null)
			this.ws.onerror = error;
	}

	sendLocation(lat, lon, acc) {
		var msg = new proto.testi.ToServer();
		var loc = new proto.testi.Location();
		loc.setLatitude(lat);
		loc.setLongitude(lon);
		loc.setAccuracy(acc);
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
		var polygon = new proto.testi.proto.Polygon();
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
		var linestring = new proto.testi.Linestring();
		linestring.setPointarray(points);
		shape.getLinestringsList().push(linestring);
		msg.setShape(shape);
		this.ws.send(msg.serializeBinary());
	}

	sendChatMessage(msg) {
		var resp = new proto.testi.ToServer();
		resp.setChatmsg(msg);
		this.ws.send(resp.serializeBinary());
	}

	joinRoom(room, password = "", create = null){
		var msg = new proto.testi.ToServer();
		var join = new proto.testi.JoinRoom();
		join.setRoomname(room);
		join.setPassword(password);
		if (create !== null)
			join.setCreateroom(create);
		msg.setJoinroom(join);
		this.ws.send(msg.serializeBinary());
	}

	login(username, key = "") {
		var msg = new proto.testi.ToServer();
		var logininfo = new proto.testi.SendLoginInfo();
		logininfo.setUsername(username);
		if (key !== "") {
			logininfo.setKey(key);
		}
		msg.setLogininfo(logininfo);
		this.ws.send(msg.serializeBinary());
	}

	createGroup(name) {
		var msg = new proto.testi.ToServer();
		var group = new proto.testi.CreateGroup();
		group.setName(name);
		msg.setCreategroup(group);
		this.ws.send(msg.serializeBinary());
	}

	joinGroup(groupid) {
		var msg = new proto.testi.ToServer();
		var group = new proto.testi.JoinGroup();
		group.setId(groupid);
		msg.setJoingroup(group);
		this.ws.send(msg.serializeBinary());
	}

	onMessage(evnt) {
		var msg = proto.testi.FromServer.deserializeBinary(evnt.data);
		console.log(msg);
		var err = msg.getErrmsg();
		if (err !== "")
			console.log(err);

		var that = this;
		if (msg.hasLoginanswer()) {
			this.onLoginResult.forEach(f=>f(msg.getLoginanswer()));
		}
		if (msg.hasJoinanswer()) {
			this.onJoinResult.forEach(f=>f(msg.getJoinanswer()));
		}
		msg.getNewgroupsList().forEach(e=>that.onNewGroup.forEach(f=>f(e)));
		msg.getUsermovedList().forEach(e=>that.onUserMoved.forEach(f=>f(e)));
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
	addLoginResultListener(func) {
		this.onLoginResult.add(func);
	}
	removeLoginResultListener(func) {
		this.onLoginResult.delete(func);
	}
	addJoinResultListener(func) {
		this.onJoinResult.add(func);
	}
	removeJoinResultListener(func) {
		this.onJoinResult.delete(func);
	}
	addNewGroupListener(func) {
		this.onNewGroup.add(func);
	}
	removeNewGroupListener(func) {
		this.onNewGroup.delete(func);
	}
	addUserMovedListener(func) {
		this.onUserMoved.add(func);
	}
	removeUserMovedListener(func) {
		this.onUserMoved.delete(func);
	}
}


