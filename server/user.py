import websockets
from enum import Enum
import testprotocol_pb2

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
        self.location = None

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
    def getusername(self):
        return self.username
    def setusername(self, username):
        self.username = username

    async def senderr(self, errmsg):
        err = testprotocol_pb2.FromServer()
        err.errmsg = errmsg
        await self.send(err)

    async def send(self, msg):
        if self.getstate() == State.DISCONNECTED:
            #TODO: jotain
            return
        try:
            await self.websocket.send(msg.SerializeToString())
        except Exception as e:
            logger.debug(e)

