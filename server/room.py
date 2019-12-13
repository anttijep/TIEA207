import testprotocol_pb2
from user import User, State
import asyncio

class Group:
    def __init__(self, name, color):
        self.name = name
        self.color = color
    def setcolor(self, color):
        self.color = color
    def getcolor(self):
        return self.color
    def setname(self, name):
        self.name = name
    def getname(self):
        return self.name

class Room:
    """
    huone johon voi liittyä ja jossa olevien viestit (location, chattiviestit jne...)
    välitetään toisille
    """
    def __init__(self):
        self.clients = {}
        self.defaultusercolor = 0xff00ff
        self.groups = {0:Group("unassigned", self.defaultusercolor)}
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
            user.setlocation([loc.latitude, loc.longitude,loc.accuracy])
            
        if msg.HasField("shape"):
            relay = True
            shape = msg.shape
            shape.senderID = self.clients[user]
            for i in shape.linestrings:
                i.id = self.drawcounter()
                self.drawings["linestrings"][i.id] = i
            for i in shape.polys:
                i.id = self.drawcounter()
                self.drawings["polygons"][i.id] = i
            for i in shape.circles:
                i.id = self.drawcounter()
                self.drawings["circles"][i.id] = i
            msgout.shapes.append(shape)

        if msg.HasField("creategroup"):
            if msg.creategroup.name:
                exists = False
                for x in self.groups.values():
                    if x.getname() == msg.creategroup.name:
                        await user.senderr("group with that name already exists")
                        exists = True
                        break

                if not exists:
                    relay = True
                    self.groups[self.nextgroupid] = Group(msg.creategroup.name, msg.creategroup.color or self.defaultusercolor)
                    newgroup = testprotocol_pb2.NewGroup()
                    newgroup.id = self.nextgroupid
                    newgroup.name = msg.creategroup.name
                    newgroup.usercolor = msg.creategroup.color or self.defaultusercolor
                    msgout.newgroups.append(newgroup)
                    self.nextgroupid += 1
            else:
                await user.senderr("invalid group name")

        if msg.HasField("joingroup"):
            usermoved = self.moveuser(user, msg.joingroup.id)
            if usermoved is not None:
                relay = True
                msgout.usermoved.append(usermoved)
            else:
                await user.senderr("error joining group")

        if msg.HasField("editgroup"):
            editgroup = self.editgroup(user, msg.editgroup)
            if editgroup is not None:
                relay = True
                msgout.editgroups.append(editgroup)
            else:
                await user.senderr("error editing group")

        if relay:
            await self.sendmessage(user, msgout)

    def getallinfo(self, msgout):
        for i in self.groups:
            group = testprotocol_pb2.NewGroup()
            group.id = i
            group.name = self.groups[i].getname()
            group.usercolor = self.groups[i].getcolor()
            msgout.newgroups.append(group)
        for i in self.clients:
            usermoved = testprotocol_pb2.UserMoved()
            usermoved.userid = self.clients[i]
            usermoved.groupid = self.usergroup[i]
            usermoved.name = i.getusername()
            msgout.usermoved.append(usermoved)

            location = testprotocol_pb2.Location()
            location.senderID = self.clients[i]
            loc = i.getlocation()
            if loc is not None:
                location.latitude = loc[0]
                location.longitude = loc[1]
                location.accuracy = loc[2]
                msgout.locations.append(location)

    def editgroup(self, user : User, msg):
        edit = False
        if msg.id in self.groups:
            if msg.delete:
                if msg.id == 0:
                    return None
                del self.groups[msg.id]
                edit = True
                return msg
            if msg.name:
                self.groups[msg.id].setname(msg.name)
                edit = True
            if msg.usercolor:
                self.groups[msg.id].setcolor(msg.usercolor)
                edit = True
        if edit:
            return msg
        return None

    def moveuser(self, user : User, groupid):
        if self.usergroup[user] != groupid and groupid in self.groups:
            self.usergroup[user] = groupid
            usermoved = testprotocol_pb2.UserMoved()
            usermoved.userid = self.clients[user]
            usermoved.groupid = groupid
            return usermoved
        return None

    def adduser(self, user : User):
        if not user in self.clients:
            self.clients[user] = self.counter()
        if not user in self.usergroup:
            self.usergroup[user] = 0
        return self.clients[user]

    async def notifyjoin(self, user : User):
        msgout = testprotocol_pb2.FromServer()
        usermoved = testprotocol_pb2.UserMoved()
        usermoved.userid = self.clients[user]
        usermoved.groupid = self.usergroup[user]
        msgout.usermoved.append(usermoved)
        await self.sendmessage(user, msgout)
    
    async def removeuser(self, user : User):
        """
        poistaa käyttäjän huoneesta
        """
        if user not in self.clients:
            return
        uid = self.clients[user]
        del self.clients[user]
        msgout = testprotocol_pb2.FromServer()
        userleft = testprotocol_pb2.UserMoved()
        userleft.disconnected = True
        userleft.userid = uid
        msgout.usermoved.append(userleft)
        await self.sendmessage(user, msgout)

    def verifypassword(self, password):
        return True
    
    def setpassword(self, user : User, password):#asettaa huoneelle salasanan
        pass
        #miten salasana tallennetaan? missä muodossa? mihin?
    
    def Addmin(self, user : User): #asettaa käyttäjän adminiksi
        pass
    
    def removeadmin(self, user : User):#poista admin oikeudet
        pass

    
