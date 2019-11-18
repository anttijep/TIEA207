#!/usr/bin/env python3
import sys
import os
import asyncio
import testprotocol_pb2
import websockets
import socket
import ssl
import logging
import secrets
from enum import Enum

FORMAT = '%(asctime)-15s %(message)s'
logging.basicConfig(format=FORMAT)
logger = logging.getLogger("server")
logger.setLevel("DEBUG")

class variables:
    hostname = "127.0.0.1"
    port = 5678
    ssl_context = None

def loadConfig(config):
    try:
        with open(config, "r") as f:
            conf = variables()
            llist = [line.rstrip() for line in f]
            conf.hostname = llist[0]
            conf.port = llist[1]
            if not llist[2].startswith('#') and not llist[3].startswith('#'):
                ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
                ssl_context.load_cert_chain(llist[2], llist[3])
                conf.ssl_context = ssl_context
            return conf
    except Exception as e:
        print(e)
    return None

class State(Enum):
    UNKNOWN = -1
    CONNECTED = 0
    LOGGED_IN = 1
    DISCONNECTED = 2

class User:
    def __init__(self):
        self.key = None #uniikki tunniste
        self.username = "anonymous"
        self.state = State.UNKNOWN
        self.websocket = None
        self.room = None
        self.location = [0,0]

    def setsocket(self, websocket):
        self.websocket = websocket
    def getsocket(self):
        return self.websocket
    def setstate(self, state):
        self.state = state;
    def getstate(self):
        return self.state;

    def setlocation(self, pos):
        self.location = pos

    def getlocation(self):
        return self.location

    async def senderr(self, errmsg):
        err = testprotocol_pb2.FromServer()
        err.errmsg = errmsg
        await self.send(err)

    async def send(self, msg):
        await self.websocket.send(msg.SerializeToString())

class Room:
    """
    huone johon voi liittyä ja jossa olevien viestit (location, chattiviestit jne...)
    välitetään toisille
    """
    def __init__(self):
        self.clients = {}
        self.groups = {0:"unassigned"}
        self.usergroup = {}
        self.nextgroupid = 1
        self.admins = {} #adminit
        self.count = 0
        self.drawcount = 0
        self.drawings = {}
        self.drawings["linestrings"] = {}
        self.drawings["circles"] = {}
        self.drawings["polygons"] = {}

    def drawcounter(self):
        self.drawcount += 1
        return self.drawcount

    def counter(self):
        """
        counteri, jotta kaikilla on uniqueid
        """
        self.count += 1
        return self.count

    async def sendmessage(self, user, msg):
        """
        lähettää viestin kaikille huoneessa oleville
        """
        if self.clients:
            await asyncio.wait([client.send(msg) for client in self.clients]) #if client != websocket])

    async def handlemessage(self, user : User, msg):
        """
        parsee viestit ja muodostaa viestin
        """
        msgout = testprotocol_pb2.FromServer()
        relay = False
        if msg.chatmsg:
            relay = True
            serverchatmsg = testprotocol_pb2.Chatmessage()
            serverchatmsg.senderID = self.clients[user]
            serverchatmsg.msg = msg.chatmsg
            msgout.chatmsg.append(serverchatmsg)

        if msg.HasField("location"):
            relay = True
            loc = msg.location
            loc.senderID = self.clients[user]
            msgout.locations.append(loc)
            user.setlocation([loc.latitude, loc.longitude])
            
        if msg.HasField("shape"):
            relay = True
            shape = msg.shape
            shape.senderID = self.clients[user]
            for i in msg.shape.linestrings:
                i.id = self.drawcounter()
                self.drawings["linestrings"][i.id] = i
            for i in msg.shape.polys:
                i.id = self.drawcounter()
                self.drawings["polygons"][i.id] = i
            for i in msg.shape.circles:
                i.id = self.drawcounter()
                self.drawings["circles"][i.id] = i
            msgout.shapes.append(shape)

        if msg.HasField("creategroup"):
            if msg.creategroup.name and msg.creategroup.name not in self.groups.values():
                relay = True
                self.groups[self.nextgroupid] = msg.creategroup.name
                newgroup = testprotocol_pb2.NewGroup()
                newgroup.id = self.nextgroupid
                newgroup.name = msg.creategroup.name
                msgout.newgroups.append(newgroup)
                self.nextgroupid += 1
            else:
                await user.senderr("invalid group name")

        if msg.HasField("joingroup"):
            if self.usergroup[user] != msg.joingroup.id and msg.joingroup.id in self.groups:
                self.usergroup[user] = msg.joingroup.id
                relay = True
                usermoved = testprotocol_pb2.UserMoved()
                usermoved.userid = self.clients[user]
                usermoved.groupid = msg.joingroup.id
                msgout.usermoved.append(usermoved)
            else:
                await user.senderr("invalid group")

        if relay:
            await self.sendmessage(user, msgout)
        
    async def adduser(self, user : User):
        if not user in self.clients:
            self.clients[user] = self.counter()
        if not user in self.usergroup:
            self.usergroup[user] = 0
            msgout = testprotocol_pb2.FromServer()
            usermoved = testprotocol_pb2.UserMoved()
            usermoved.userid = self.clients[user]
            usermoved.groupid = 0
            msgout.usermoved.append(usermoved)
            await self.sendmessage(user, msgout)
        return self.clients[user]
    
    def removeuser(self, user : User):
        """
        poistaa käyttäjän huoneesta
        """
        del self.clients[user]

    def verifypassword(self, password):
        return True
    
    def setpassword(self, user : User):#asettaa huoneelle salasanan
        pass
        #miten salasana tallennetaan? missä muodossa? mihin?
    
    def Addmin(self, user : User): #asettaa käyttäjän adminiksi
        pass
    
    def removeadmin(self, user : User):#poista admin oikeudet
        pass
    
###TODO: joku luokka, joka handlaa servun kaikki huoneet
###ja pitää huolta oikeuksista jne
class RoomHandler:
    def __init__(self):
        self.rooms = {}#dict jossa huoneet olioina, huoneen nimi on avain
    
    async def messagehandler(self, user : User, msg): #välittää vietit huoneille
        if user.getstate() != State.LOGGED_IN:
            await user.senderr("login first")
            return
        if msg.HasField("joinroom"):
            await self.handleJoinRoom(user, msg.joinroom)
            return
        room = self.rooms.get(user.room)
        if room is not None:
            await room.handlemessage(user, msg)
    
    async def handleJoinRoom(self, user : User, msg):
        answer = testprotocol_pb2.FromServer()
        if not msg.roomname:
            answer.joinanswer.success = False
            answer.joinanswer.errmsg = "Empty name not allowed!"
            await user.send(answer)
            return

        currentroom = self.rooms.get(user.room)
        room = self.rooms.get(msg.roomname)
        if currentroom is not None and currentroom != room:
            currentroom.removeuser(user)

        if room is None:
            logger.info("Creating room: " + msg.roomname)
            room = Room()
            self.rooms[msg.roomname] = room
            if msg.password:
                room.setpassword(msg.password, user)

        elif not room.verifypassword(msg.password):
            answer.joinanswer.success = False
            answer.joinanswer.errmsg = "Wrong password!"
            await user.send(answer)
            return

        answer.joinanswer.success = True
        user.room = msg.roomname
        uid = await room.adduser(user)
        answer.joinanswer.id = uid

        await user.send(answer)
        
    def handlelogout(self, user : User): #yhteyden katkaisu palvelimelta
        room = self.rooms.get(user.room)
        if room is None:
            return
        #room.removeuser(user)
        
class LoginHandler():
    def __init__(self):
        self.users = {}

    async def handleLogin(self, user : User, msg) -> User:
        resp = testprotocol_pb2.FromServer()
        if user.getstate() == State.LOGGED_IN:
            logger.info("Already logged in")
            resp.loginanswer.errmsg = "Already logged in"
            resp.loginanswer.success = False
            await user.send(resp)
            return user
        if msg.logininfo.key and len(msg.logininfo.key) == 64 and msg.logininfo.key in self.users:
            olduser = user
            user = self.users[msg.logininfo.key]
            user.setsocket(olduser.getsocket())
            resp.loginanswer.oldroom = user.room
        else:
            user.key = secrets.token_hex(32)
            self.users[user.key] = user

        if msg.logininfo.username:
            user.username = msg.logininfo.username
        user.state = State.LOGGED_IN
        resp = testprotocol_pb2.FromServer()

        resp.loginanswer.key = user.key
        resp.loginanswer.username = user.username
        resp.loginanswer.success = True
        await user.send(resp)
        return user

    async def handleLogout(self, roomhandler : RoomHandler, user : User):
        roomhandler.handlelogout(user)


roomhandler = RoomHandler()
loginhandler = LoginHandler()

async def serv(websocket, path):
    addr = websocket.remote_address
    logger.info("%s connected", addr)
    user = User()
    user.setsocket(websocket)
    user.setstate(State.CONNECTED)
    try:
        async for message in websocket:		#palvelimen juttelu clientin kanssa
            msg = testprotocol_pb2.ToServer()
            msg.ParseFromString(message)	#clientiltä tullut viesti parsetaan auki
            logger.debug(msg)
            if msg.HasField("logininfo"):
                user = await loginhandler.handleLogin(user, msg)
            await roomhandler.messagehandler(user, msg)
    except Exception as e:
        print(e)
        raise
    finally:
        await loginhandler.handleLogout(roomhandler, user)
        logger.info("%s closed connection", addr)

def runServer(config):
    logger.info("Starting server... " + config.hostname +":" + config.port)
    logger.info("ssl enabled: " + str(config.ssl_context is not None))
    start_server = websockets.serve(serv, config.hostname, config.port, ssl=config.ssl_context)
    asyncio.get_event_loop().run_until_complete(start_server)
    asyncio.get_event_loop().run_forever()

if __name__ == "__main__":
    config = loadConfig("server.config")
    if config is not None:
        runServer(config)

