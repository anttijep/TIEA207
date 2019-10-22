#!/usr/bin/env python

# WS server that sends messages at random intervals

import asyncio
import testprotocol_pb2
import datetime
import random
import websockets

clients = set()
lock = asyncio.Lock()

def counter():
    counter.count += 1
    return counter.count - 1
counter.count = 0

async def adduser(websocket):
    clients.add(websocket)

async def removeuser(websocket):
    clients.remove(websocket)

async def sendmessage(websocket, msg):
    if clients:
        await asyncio.wait([client.send(msg) for client in clients]) #if client != websocket])

async def serv(websocket, path):
    msg = testprotocol_pb2.Chatmessage()
    msg.senderID = counter()
    msg.senderName = "testi"
    await adduser(websocket)
    try:
        while True:
            async for message in websocket:
                print(message)
                msg.msg = message
                bytes = msg.SerializeToString()
                await sendmessage(websocket, bytes)
    finally:
        await removeuser(websocket)

start_server = websockets.serve(serv, "127.0.0.1", 5678)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()