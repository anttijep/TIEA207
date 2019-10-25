#!/usr/bin/env python3

import asyncio
import testprotocol_pb2
import websockets
import html
import socket
import os
import sys
import ssl


hostname = "127.0.0.1"
port = 5678
ssl_context = None
try:
    with open("server.config", "r") as f:
        llist = [line.rstrip() for line in f]
        hostname = llist[0]
        print("hostname: " + hostname)
        port = llist[1]
        print("port: " + port)
        if not llist[2].startswith('#') and not llist[3].startswith('#'):
            ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            ssl_context.load_cert_chain(llist[2], llist[3])
except Exception as e:
    print(e)

class Room:
    clients = {}
    count = 0
    def counter(self):
        self.count += 1
        return self.count

    async def sendmessage(self, websocket, msg):
        if self.clients:
            await asyncio.wait([client.send(msg) for client in self.clients]) #if client != websocket])

    async def handlemessage(self, websocket, msg, answer):
        if msg.chatmsg:
            chatmsg = testprotocol_pb2.Chatmessage()
            chatmsg.senderID = self.clients[websocket]
            chatmsg.msg = html.escape(msg.chatmsg)
            answer.chatmsg.append(chatmsg)

        if msg.HasField("location"):
            loc = testprotocol_pb2.Location()
            loc.senderID = self.clients[websocket]
            loc.latitude = msg.location.latitude
            loc.longitude = msg.location.longitude
            answer.locations.append(loc)
        bytes = answer.SerializeToString()
        await self.sendmessage(websocket, bytes)

    def adduser(self, websocket):
        self.clients[websocket] = self.counter()
    
    def removeuser(self, websocket):
        del self.clients[websocket]
    
    
room = Room()

async def serv(websocket, path):
    print("New connection!")
    room.adduser(websocket)
    try:
        async for message in websocket:
            print(message)
            answer = testprotocol_pb2.FromServer()
            msg = testprotocol_pb2.ToServer()
            msg.ParseFromString(message)
            await room.handlemessage(websocket, msg, answer)
    except Exception as e:
        print(e)
    finally:
        room.removeuser(websocket)

if ssl_context is not None:
    start_server = websockets.serve(serv, hostname, port, ssl=ssl_context)
else:
    start_server = websockets.serve(serv, hostname, port)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()


