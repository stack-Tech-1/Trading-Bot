"""
bridge.py
Python bridge between the MetaTrader 5 EA and the frontend dashboard.

Responsibilities:
  1. Watch trades.json for changes and broadcast updates over WebSocket.
  2. Accept settings_update messages from the dashboard and write settings.json.
  3. Periodically fetch high-impact news and write news_events.json for the EA.

Usage:
  python bridge.py

Configuration via .env file (see .env.example) or environment variables.
"""

import asyncio
import json
import logging
import os
import schedule
import threading
import time

import websockets
import websockets.exceptions
from dotenv import load_dotenv
from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

from news_fetcher import run_news_fetch

# ---------------------------------------------------------------------------
# Load .env first so os.getenv() picks up the values below
# ---------------------------------------------------------------------------
load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# TODO: Update SHARED_FOLDER to your MT5 terminal's MQL5\Files\ path before running.
# Example: C:\Users\YOUR_USERNAME\AppData\Roaming\MetaQuotes\Terminal\YOUR_TERMINAL_ID\MQL5\Files\
# ---------------------------------------------------------------------------
SHARED_FOLDER = os.getenv(
    "SHARED_FOLDER",
    r"C:\Users\USERNAME\AppData\Roaming\MetaQuotes\Terminal\TERMINAL_ID\MQL5\Files",
)
WS_HOST = os.getenv("WS_HOST", "localhost")
WS_PORT = int(os.getenv("WS_PORT", "8765"))

# ---------------------------------------------------------------------------
# Logging — console + file
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("bridge.log", encoding="utf-8"),
    ],
)

# ---------------------------------------------------------------------------
# Retry helper — handles MT5 file locks by retrying on PermissionError
# ---------------------------------------------------------------------------
def read_json_file(filepath, retries=5, delay=0.1):
    for attempt in range(retries):
        try:
            with open(filepath, "r", encoding="utf-16") as f:
                return json.load(f)
        except PermissionError:
            if attempt < retries - 1:
                time.sleep(delay)
            else:
                logging.error(f"Could not read {filepath} after {retries} attempts")
                return None
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            logging.error(f"Error parsing {filepath}: {e}")
            return None
    return None


# ---------------------------------------------------------------------------
# Global WebSocket client registry
# ---------------------------------------------------------------------------
connected_clients: set = set()


# ---------------------------------------------------------------------------
# File watcher — triggered by watchdog when trades.json changes on disk
# ---------------------------------------------------------------------------
class TradesFileHandler(FileSystemEventHandler):
    """Watches the shared folder and broadcasts trades.json updates."""

    def __init__(self, loop: asyncio.AbstractEventLoop) -> None:
        super().__init__()
        self.loop = loop

    def on_modified(self, event) -> None:
        if not event.src_path.endswith("trades.json"):
            return
        data = read_json_file(event.src_path)
        if data is None:
            logging.warning("[Watcher] Skipping broadcast — trades.json could not be read")
            return
        asyncio.run_coroutine_threadsafe(broadcast(data), self.loop)


# ---------------------------------------------------------------------------
# Broadcast — send a data dict to every connected WebSocket client
# ---------------------------------------------------------------------------
async def broadcast(data: dict) -> None:
    dead: set = set()
    for client in connected_clients:
        try:
            await client.send(json.dumps(data))
        except websockets.exceptions.ConnectionClosed:
            dead.add(client)
    connected_clients.difference_update(dead)


# ---------------------------------------------------------------------------
# WebSocket client handler
# ---------------------------------------------------------------------------
async def handle_client(websocket) -> None:
    """
    Called by websockets.serve() for each new connection.
    - Sends the current trades.json immediately on connect.
    - Listens for settings_update messages and writes settings.json.
    """
    connected_clients.add(websocket)
    remote = websocket.remote_address
    logging.info(f"[WS] Client connected: {remote}")

    # Send current state immediately so the dashboard loads with data
    trades_path = os.path.join(SHARED_FOLDER, "trades.json")
    initial_data = read_json_file(trades_path)
    if initial_data is None:
        logging.warning("[WS] trades.json unavailable on connect — sending empty state")
        await websocket.send(json.dumps({}))
    else:
        await websocket.send(json.dumps(initial_data))

    try:
        async for raw_message in websocket:
            try:
                msg = json.loads(raw_message)
            except json.JSONDecodeError:
                logging.warning(f"[WS] Non-JSON message from {remote}, ignoring")
                continue

            if msg.get("type") == "settings_update":
                payload = msg.get("payload", {})
                settings_path = os.path.join(SHARED_FOLDER, "settings.json")
                try:
                    with open(settings_path, "w", encoding="utf-8") as f:
                        json.dump(payload, f, indent=2)
                    logging.info(f"[Settings] Updated settings.json from dashboard at {remote}")
                    await broadcast({"type": "settings_confirmed", "payload": payload})
                except OSError as e:
                    logging.error(f"[Settings] Failed to write settings.json: {e}")

    except websockets.exceptions.ConnectionClosed:
        pass  # clean disconnect — no action needed
    finally:
        connected_clients.discard(websocket)
        logging.info(f"[WS] Client disconnected: {remote}")


# ---------------------------------------------------------------------------
# WebSocket server
# ---------------------------------------------------------------------------
async def start_websocket_server() -> None:
    async with websockets.serve(handle_client, WS_HOST, WS_PORT):
        logging.info(f"WebSocket server started on ws://{WS_HOST}:{WS_PORT}")
        await asyncio.Future()


# ---------------------------------------------------------------------------
# File watcher startup
# ---------------------------------------------------------------------------
def start_file_watcher(loop: asyncio.AbstractEventLoop) -> Observer:
    handler = TradesFileHandler(loop)
    observer = Observer()
    observer.schedule(handler, SHARED_FOLDER, recursive=False)
    observer.start()
    logging.info(f"[Watcher] File watcher started on {SHARED_FOLDER}")
    return observer


# ---------------------------------------------------------------------------
# News scheduler — runs in its own daemon thread
# ---------------------------------------------------------------------------
def run_scheduler() -> None:
    """Fetch news immediately on startup, then every 6 hours."""
    run_news_fetch(SHARED_FOLDER)
    schedule.every(6).hours.do(run_news_fetch, SHARED_FOLDER)
    while True:
        schedule.run_pending()
        time.sleep(60)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main() -> None:
    load_dotenv()
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    observer = start_file_watcher(loop)

    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()

    try:
        loop.run_until_complete(start_websocket_server())
    except KeyboardInterrupt:
        logging.info("Bridge shutting down")
    finally:
        observer.stop()
        observer.join()
        loop.close()


if __name__ == "__main__":
    main()
