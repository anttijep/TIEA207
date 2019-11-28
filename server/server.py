#!/usr/bin/env python3
import sys
import os
import asyncio
import testprotocol_pb2
import websockets
import socket
import ssl
import logging
from user import User, State
from enum import Enum
from roomhandler import RoomHandler
from loginhandler import LoginHandler

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


roomhandler = RoomHandler()
loginhandler = LoginHandler()

async def serv(websocket, path):
    addr = websocket.remote_address
    logger.info("%s connected", addr)
    user = User()
    user.setsocket(websocket)
    user.setstate(State.CONNECTED)
    try:
        async for message in websocket:		#palvelimen juttelu clientin kanssa
            msg = testprotocol_pb2.ToServer()
            msg.ParseFromString(message)	#clientiltä tullut viesti parsetaan auki
            logger.debug(msg)
            if msg.HasField("logininfo"):
                user = await loginhandler.handleLogin(user, msg)
            await roomhandler.messagehandler(user, msg)

    except Exception as e:
        print(e)
        raise
    finally:
        await loginhandler.handleLogout(roomhandler, user)
        logger.info("%s closed connection", addr)

def runServer(config):
    logger.info("Starting server... " + config.hostname +":" + str(config.port))
    logger.info("ssl enabled: " + str(config.ssl_context is not None))
    start_server = websockets.serve(serv, config.hostname, config.port, ssl=config.ssl_context)
    asyncio.get_event_loop().run_until_complete(start_server)
    asyncio.get_event_loop().run_forever()

if __name__ == "__main__":
    config = loadConfig("server.config") or variables()
    runServer(config)

