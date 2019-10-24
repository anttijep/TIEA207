#!/usr/bin/env python3

import asyncio
import testprotocol_pb2
import websockets
import html
import socket
import os
import sys
import ssl

clients = set()

hostname = "127.0.0.1"
port = 5678
ssl_context = None
try:
    with open("server.config", "r") as f:
        llist = [line.rstrip() for line in f]
        hostname = llist[0]
        port = llist[1]
        if not llist[2].startswith('#') and not llist[3].startswith('#'):
            ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            ssl_context.load_cert_chain(llist[2], llist[3])
except Exception as e:
    print(e)


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

if ssl_context is not None:
    start_server = websockets.serve(serv, hostname, port, ssl=ssl_context)
else:
    start_server = websockets.serve(serv, hostname, port)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()


