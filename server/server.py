#!/usr/bin/env python

import asyncio
import testprotocol_pb2
import websockets
import html
import socket
import os
import sys


clients = set()

hostname = "4nxi.xyz"
port = 5678

def counter():
    counter.count += 1
    return counter.count - 1
counter.count = 0

def adduser(websocket):
    clients.add(websocket)

def removeuser(websocket):
    clients.remove(websocket)

async def sendmessage(websocket, msg):
    if clients:
        await asyncio.wait([client.send(msg) for client in clients]) #if client != websocket])

async def serv(websocket, path):
    print("New connection!")
    msg = testprotocol_pb2.Chatmessage()
    msg.senderID = counter()
    msg.senderName = "testi"
    adduser(websocket)
    while True:
        try:
            async for message in websocket:
                print(message)
                msg.msg = html.escape(message)
                bytes = msg.SerializeToString()
                await sendmessage(websocket, bytes)
        except:
            print(sys.exc_info()[0])
        finally:
            removeuser(websocket)
            break

start_server = websockets.serve(serv, hostname, port)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()


