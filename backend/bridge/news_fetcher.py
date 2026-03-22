"""
news_fetcher.py
Fetches high-impact forex news from the ForexFactory free JSON feed and writes
the results to news_events.json for the MetaTrader EA to consume.
"""

import json
import logging
import os
import requests
from datetime import datetime


def fetch_forex_factory_calendar() -> list:
    """
    Fetches this week's calendar from the ForexFactory free JSON feed.
    No API key required.

    Returns a list of high-impact event dicts:
        {
            "eventTime": "YYYY-MM-DD HH:MM:SS",  # naive, server-local date/time
            "currency":  "USD",                   # 3-char country code from FF
            "title":     "Non-Farm Payrolls",
            "impact":    3                         # always 3 for high-impact
        }
    Returns an empty list on any network or parse error.
    """
    url = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        raw_events = response.json()
    except requests.RequestException as e:
        logging.error(f"[News] Failed to fetch ForexFactory calendar: {e}")
        return []
    except ValueError as e:
        logging.error(f"[News] Failed to parse ForexFactory response as JSON: {e}")
        return []

    events = []
    for raw in raw_events:
        if raw.get("impact") != "High":
            continue

        # --- date field: ISO string with timezone, e.g. "2026-03-15T00:00:00-0500" ---
        date_str = raw.get("date", "")
        try:
            # fromisoformat handles the offset suffix on Python 3.7+
            date_part = datetime.fromisoformat(date_str).date()
        except (ValueError, TypeError):
            logging.warning(f"[News] Unrecognised date format '{date_str}', skipping event")
            continue

        # --- time field: "8:30am", "2:00pm", "" or "All Day" ---
        time_str = raw.get("time", "") or ""
        time_str = time_str.strip()
        if not time_str or time_str.lower() == "all day":
            time_part = "00:00:00"
        else:
            try:
                # "%I:%M%p" handles both "8:30am" and "12:00pm"
                parsed_time = datetime.strptime(time_str.lower(), "%I:%M%p")
                time_part = parsed_time.strftime("%H:%M:%S")
            except ValueError:
                logging.warning(f"[News] Unrecognised time format '{time_str}', using 00:00:00")
                time_part = "00:00:00"

        events.append({
            "eventTime": f"{date_part} {time_part}",
            "currency":  raw.get("country", ""),
            "title":     raw.get("title", ""),
            "impact":    3,
        })

    logging.info(f"[News] Fetched {len(events)} high-impact events from ForexFactory")
    return events


def save_news_to_json(events: list, output_path: str) -> None:
    """
    Writes the events list to output_path as a pretty-printed JSON file.
    Creates parent directories if they do not exist.
    """
    parent = os.path.dirname(output_path)
    if parent:
        os.makedirs(parent, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(events, f, indent=2)

    logging.info(f"[News] Wrote {len(events)} events to {output_path}")


def run_news_fetch(shared_folder: str) -> None:
    """
    Convenience entry point: fetch the calendar and write news_events.json
    into shared_folder.  Called by the scheduler in bridge.py.
    """
    events = fetch_forex_factory_calendar()
    output_path = os.path.join(shared_folder, "news_events.json")
    save_news_to_json(events, output_path)
    logging.info(f"[News] News fetch complete at {datetime.now().isoformat()}")
