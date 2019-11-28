from user import User, State
from roomhandler import RoomHandler
import testprotocol_pb2
import secrets
import logging

logger = logging.getLogger("server")

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
            user.setusername(msg.logininfo.username)
        user.state = State.LOGGED_IN
        resp = testprotocol_pb2.FromServer()

        resp.loginanswer.key = user.key
        resp.loginanswer.username = user.username
        resp.loginanswer.success = True
        await user.send(resp)
        return user

    async def handleLogout(self, roomhandler : RoomHandler, user : User):
        roomhandler.handlelogout(user)


