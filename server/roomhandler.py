from user import User, State
from room import Room
import testprotocol_pb2
import logging
import asyncio

logger = logging.getLogger("server")

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
            answer.errmsg = "Empty name not allowed!"
            await user.send(answer)
            return

        if msg.roomname == user.room:
            answer.joinanswer.success = False
            answer.errmsg = "Already in that room"
            await user.send(answer)
            return

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
            await user.send(answer)
            return

        tasks = []
        currentroom = self.rooms.get(user.room)
        if currentroom is not None and currentroom != room:
            tasks.append(currentroom.removeuser(user))


        answer.joinanswer.success = True
        user.room = msg.roomname
        uid = room.adduser(user)
        answer.joinanswer.id = uid
        answer.joinanswer.roomname = msg.roomname
        room.getallinfo(answer)
        tasks.append(user.send(answer))
        tasks.append(room.notifyjoin(user))
        await asyncio.gather(*tasks)
        
    async def handlelogout(self, user : User): #yhteyden katkaisu palvelimelta
        user.setstate(State.DISCONNECTED)
        room = self.rooms.get(user.room)
        if room is None:
            return
        await room.removeuser(user)
        
