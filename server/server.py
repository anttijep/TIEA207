#!/usr/bin/env python3
import sys
import os
import asyncio
import testprotocol_pb2
import websockets
import html
import socket
import ssl

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



class Room:
    """
    huone johon voi liittyä ja jossa olevien viestit (location, chattiviestit jne...)
    välitetään toisille
    """
    clients = {}
    count = 0
    def counter(self):
        """
        counteri, jotta kaikilla on uniqueid
        """
        self.count += 1
        return self.count

    async def sendmessage(self, websocket, msg):
        """
        lähettää viestin kaikille huoneessa oleville
        """
        if self.clients:
            await asyncio.wait([client.send(msg) for client in self.clients]) #if client != websocket])

    async def handlemessage(self, websocket, msg, msgout):
        """
        parsee viestit ja muodostaa viestin
        msgout parametri varmaan poistettavissa, jos ei löydy
        käyttötarkoitusta, jossa servu injectaisi viestiin jotain
        """
        if msg.chatmsg:
            chatmsg = testprotocol_pb2.Chatmessage()
            chatmsg.senderID = self.clients[websocket]
            chatmsg.msg = html.escape(msg.chatmsg)
            msgout.chatmsg.append(chatmsg)

        if msg.HasField("location"):
            loc = testprotocol_pb2.Location()
            loc.senderID = self.clients[websocket]
            loc.latitude = msg.location.latitude
            loc.longitude = msg.location.longitude
            msgout.locations.append(loc)
        bytes = msgout.SerializeToString()
        await self.sendmessage(websocket, bytes)

    def adduser(self, websocket):
        """
        lisää käyttäjän huoneeseen
        todo(?): ota parametrinä msg, jossa on position, nimi jne
        ja ilmoita se muille(?)
        """
        self.clients[websocket] = self.counter()
    
    def removeuser(self, websocket):
        """
        poistaa käyttäjän huoneesta
        """
        del self.clients[websocket]
    
###TODO: joku luokka, joka handlaa servun kaikki huoneet
###ja pitää huolta oikeuksista jne
class RoomHandler:
    room = Room()
    async def messagehandler(self, websocket, msg, answer): ###välittää vietit huoneille
        await self.room.handlemessage(websocket, msg, answer)
    
    def handlelogin(self, websocket):
        self.room.adduser(websocket)
    
    def handlelogout(self, websocket):
        self.room.removeuser(websocket)
	
##class User:
roomhandler = RoomHandler()


async def serv(websocket, path):
    print("New connection!")
    roomhandler.handlelogin(websocket)
    try:
        async for message in websocket:		#palvelimen juttelu clientin kanssa
            print(message)
            answer = testprotocol_pb2.FromServer()
            msg = testprotocol_pb2.ToServer()
            msg.ParseFromString(message)	#clientiltä tullut viesti parsetaan auki
            await roomhandler.messagehandler(websocket, msg, answer)
    except Exception as e:
        print(e)
    finally:
        roomhandler.handlelogout(websocket)



def runServer(config):
    print("Starting server...\nhostname: " + config.hostname)
    print("port: " + config.port)
    print("ssl enabled: " + str(config.ssl_context is not None))
    start_server = websockets.serve(serv, config.hostname, config.port, ssl=config.ssl_context)
    asyncio.get_event_loop().run_until_complete(start_server)
    asyncio.get_event_loop().run_forever()

if __name__ == "__main__":
    config = loadConfig("server.config")
    runServer(config)

