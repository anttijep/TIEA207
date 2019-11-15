#!/usr/bin/env python3
import sys
import os
import asyncio
import testprotocol_pb2
import websockets
import html
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

class User: #user class on vain huoneen sisällä
    key = None #uniikki tunniste
    username = "anonymous"
    state = State.UNKNOWN
    websocket = None
    room = None

    async def send(self, msg):
        await self.websocket.send(msg)
    
    def addwebsocket(): #liittää websocketin käyttäjään
        pass

class Room:
    """
    huone johon voi liittyä ja jossa olevien viestit (location, chattiviestit jne...)
    välitetään toisille
    """
    def __init__(self):
        self.clients = {}
        self.members = {} #huoneen jäsenet eli user classit
        self.teams = {#joukkuelista
            "default": "unassigned" #luodaan oletusjoukkue
        }
        self.admins = {} #adminit
        self.count = 0

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

    async def handlemessage(self, user, msg):
        """
        parsee viestit ja muodostaa viestin
        """
        msgout = testprotocol_pb2.FromServer()
        if msg.chatmsg:
            serverchatmsg = testprotocol_pb2.Chatmessage()
            serverchatmsg.senderID = self.clients[user]
            serverchatmsg.msg = html.escape(msg.chatmsg)
            msgout.chatmsg.append(serverchatmsg)

        if msg.HasField("location"):
            loc = msg.location
            loc.senderID = self.clients[user]
            msgout.locations.append(loc)
            
        if msg.HasField("shape"):
            shape = msg.shape
            shape.senderID = self.clients[user]
            msgout.shapes.append(shape)

        bytes = msgout.SerializeToString()
        await self.sendmessage(user, bytes)
        
    def adduser(self, user : User):
        self.clients[user] = self.counter()
    
    def removeuser(self, user : User):
        """
        poistaa käyttäjän huoneesta
        """
        del self.clients[user]
        #del self.members[userID]

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
    
    async def messagehandler(self, user, msg): #välittää vietit huoneille
        if msg.HasField("joinroom"):
            await self.handleJoinRoom(user, msg.joinroom)
            return
        room = self.rooms.get(user.room)
        if room is not None:
            await room.handlemessage(user, msg)
    
    async def handleJoinRoom(self, user, msg):
        answer = testprotocol_pb2.FromServer()
        joinanswer = testprotocol_pb2.JoinRoomAnswer()
        answer.joinanswer.success = True
        if not msg.roomname:
            answer.joinanswer.success = False
            answer.joinanswer.errmsg = "Empty name not allowed!"
            await user.send(answer.SerializeToString())
            return

        currentroom = self.rooms.get(user.room)
        if currentroom is not None:
            currentroom.removeuser(user)

        room = self.rooms.get(msg.roomname)
        if room is None:
            logger.info("Creating room: " + msg.roomname)
            room = Room()
            self.rooms[msg.roomname] = room
            if msg.password:
                room.setpassword(msg.password, user)

        elif not room.verifypassword(msg.password):
            answer.joinanswer.success = False
            answer.joinanswer.errmsg = "Wrong password!"
            await user.send(answer.SerializeToString())
            return

        user.room = msg.roomname
        room.adduser(user)
        await user.send(answer.SerializeToString())
        
    def handlelogout(self, user): #yhteyden katkaisu palvelimelta
        room = self.rooms.get(user.room)
        if room is None:
            return
        room.removeuser(user)
        
class LoginHandler():
    async def handleLogin(self, user : User, msg):
        resp = testprotocol_pb2.FromServer()
        if user.state == State.LOGGED_IN:
            logger.info("Already logged in")
            resp.loginanswer.errmsg = "Already logged in"
            resp.loginanswer.success = False
            await user.send(resp.SerializeToString())
            return

        user.key = secrets.token_hex(32)
        if msg.logininfo.username:
            user.username = msg.logininfo.username
        user.state = State.LOGGED_IN
        resp = testprotocol_pb2.FromServer()

        resp.loginanswer.key = user.key
        resp.loginanswer.username = user.username
        resp.loginanswer.success = True
        await user.send(resp.SerializeToString())

    async def handleLogout(self, roomhandler : RoomHandler, user : User):
        roomhandler.handlelogout(user)


roomhandler = RoomHandler()
loginhandler = LoginHandler()

async def serv(websocket, path):
    addr = websocket.remote_address
    logger.info("%s connected", addr)
    user = User()
    user.websocket = websocket
    user.state = State.CONNECTED
    try:
        async for message in websocket:		#palvelimen juttelu clientin kanssa
            msg = testprotocol_pb2.ToServer()
            msg.ParseFromString(message)	#clientiltä tullut viesti parsetaan auki
            logger.debug(msg);
            if msg.HasField("logininfo"):
                await loginhandler.handleLogin(user, msg)
            if user.state == State.LOGGED_IN:
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

