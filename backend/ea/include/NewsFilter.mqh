//+------------------------------------------------------------------+
//|                                                 NewsFilter.mqh  |
//|  High-impact news event filter for TradingBot EA.               |
//|  Reads news_events.json from the MT5 Common Files folder and    |
//|  blocks entries within ±pauseMinutes of an impact-3 event.      |
//+------------------------------------------------------------------+
#ifndef NEWSFILTER_MQH
#define NEWSFILTER_MQH

//+------------------------------------------------------------------+
//| NewsEvent struct                                                 |
//+------------------------------------------------------------------+
struct NewsEvent
{
   datetime eventTime;   // scheduled release time (UTC)
   string   currency;    // affected currency code (e.g. "USD", "EUR")
   string   title;       // event name (e.g. "Non-Farm Payrolls")
   int      impact;      // 3 = high, 2 = medium, 1 = low
};

// Global event array — populated by LoadNewsFromJSON()
NewsEvent newsEvents[];

//+------------------------------------------------------------------+
//| NewsExtractValue                                                 |
//| Local helper: extracts a raw value string for a given key from  |
//| a small JSON object string.  Mirrors ExtractJSONValue() logic   |
//| from TradingBot.mq5 but scoped to this file.                    |
//+------------------------------------------------------------------+
string NewsExtractValue(const string &json, const string key)
{
   string searchFor = "\"" + key + "\"";
   int keyPos = StringFind(json, searchFor, 0);
   if(keyPos < 0) return "";

   int colonPos = StringFind(json, ":", keyPos + StringLen(searchFor));
   if(colonPos < 0) return "";

   int commaPos = StringFind(json, ",", colonPos + 1);
   int bracePos = StringFind(json, "}", colonPos + 1);

   int endPos;
   if(commaPos < 0 && bracePos < 0) return "";
   else if(commaPos < 0) endPos = bracePos;
   else if(bracePos < 0) endPos = commaPos;
   else endPos = (int)MathMin(commaPos, bracePos);

   string raw = StringSubstr(json, colonPos + 1, endPos - colonPos - 1);
   StringTrimLeft(raw);
   StringTrimRight(raw);

   // Strip surrounding quotes for string values
   if(StringLen(raw) >= 2
      && StringGetCharacter(raw, 0) == '"'
      && StringGetCharacter(raw, StringLen(raw) - 1) == '"')
   {
      raw = StringSubstr(raw, 1, StringLen(raw) - 2);
   }

   return raw;
}

//+------------------------------------------------------------------+
//| LoadNewsFromJSON                                                 |
//| Opens news_events.json from FILE_COMMON and parses each         |
//| {…} object block into a NewsEvent record.                        |
//|                                                                  |
//| Expected format (array of objects):                             |
//|   [                                                              |
//|     {"eventTime":"2026-03-15 14:30:00","currency":"USD",        |
//|      "title":"Non-Farm Payrolls","impact":3},                   |
//|     ...                                                          |
//|   ]                                                              |
//+------------------------------------------------------------------+
void LoadNewsFromJSON()
{
   int handle = FileOpen("news_events.json", FILE_READ | FILE_TXT | FILE_COMMON);
   if(handle == INVALID_HANDLE)
   {
      Print("[News] news_events.json not found — news filter disabled.");
      ArrayResize(newsEvents, 0);
      return;
   }

   // Read entire file into one string
   string json = "";
   while(!FileIsEnding(handle))
      json += FileReadString(handle);
   FileClose(handle);

   ArrayResize(newsEvents, 0);

   // Scan for { … } blocks — each block is one news event
   int pos = 0;
   while(true)
   {
      int startPos = StringFind(json, "{", pos);
      if(startPos < 0) break;

      int endPos = StringFind(json, "}", startPos + 1);
      if(endPos < 0) break;

      // Extract the block including the braces so NewsExtractValue can find the closing }
      string block = StringSubstr(json, startPos, endPos - startPos + 1);

      string valTime     = NewsExtractValue(block, "eventTime");
      string valCurrency = NewsExtractValue(block, "currency");
      string valTitle    = NewsExtractValue(block, "title");
      string valImpact   = NewsExtractValue(block, "impact");

      if(valTime != "" && valCurrency != "" && valImpact != "")
      {
         int n = ArraySize(newsEvents);
         ArrayResize(newsEvents, n + 1);
         newsEvents[n].eventTime = StringToTime(valTime);
         newsEvents[n].currency  = valCurrency;
         newsEvents[n].title     = valTitle;
         newsEvents[n].impact    = (int)StringToInteger(valImpact);
      }

      pos = endPos + 1;
   }

   Print("[News] Loaded ", ArraySize(newsEvents), " news events");
}

//+------------------------------------------------------------------+
//| IsNewsActive                                                     |
//| Returns true if a high-impact (impact == 3) news event for the  |
//| symbol's currency pair is scheduled within ±pauseMinutes of     |
//| the current server time.                                         |
//+------------------------------------------------------------------+
bool IsNewsActive(string symbol, int pauseMinutes)
{
   // Synthetic indices are not affected by real-world news
   if(StringFind(symbol, "Volatility") >= 0 ||
      StringFind(symbol, "Boom")       >= 0 ||
      StringFind(symbol, "Crash")      >= 0)
      return false;

   // Extract the two relevant currency codes from the symbol
   string base, quote;
   if(StringFind(symbol, "XAU") >= 0)
   {
      base  = "XAU";
      quote = "USD";
   }
   else
   {
      base  = StringSubstr(symbol, 0, 3);
      quote = StringSubstr(symbol, 3, 3);
   }

   int total = ArraySize(newsEvents);
   for(int i = 0; i < total; i++)
   {
      if(newsEvents[i].impact < 3)                                      continue;
      if(newsEvents[i].currency != base && newsEvents[i].currency != quote) continue;

      int minutesDiff = (int)((TimeCurrent() - newsEvents[i].eventTime) / 60);

      if(MathAbs(minutesDiff) <= pauseMinutes)
      {
         Print("[News] NEWS FILTER ACTIVE — ", newsEvents[i].title,
               " in ", minutesDiff, " min");
         return true;
      }
   }

   return false;
}

//+------------------------------------------------------------------+
#endif // NEWSFILTER_MQH
