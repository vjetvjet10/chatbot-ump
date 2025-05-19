import asyncio
import websockets
async def test():
    uri = "ws://localhost:8000/chat"
    async with websockets.connect(uri) as websocket:
        await websocket.send("các phương thức tuyển sinh")
        while True:
            msg = await websocket.recv()
            print("🤖", msg)

asyncio.run(test())
