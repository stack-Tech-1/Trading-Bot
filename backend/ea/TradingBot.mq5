//+------------------------------------------------------------------+
//|                                                  TradingBot.mq5 |
//|                                  MetaTrader 5 Expert Advisor     |
//+------------------------------------------------------------------+
//
//  4-TIER ENTRY LOGIC OVERVIEW
//  ============================
//
//  TIER 1 — HARD GATES (ALL must pass before any trade can be opened)
//  ------------------------------------------------------------------
//  1. MasterSwitch must be TRUE
//  2. Daily drawdown must be below DailyDrawdownLimitPct
//  3. NewsFilter: no high-impact news within ±NewsPauseMinutes (if enabled for asset)
//  4. SessionFilter: price action within valid trading session (if enabled for asset)
//  All four must pass. If any gate fails, no trade is opened for that tick.
//
//  TIER 2 — DIRECTIONAL BIAS (at least 1 of 2 must confirm direction)
//  -------------------------------------------------------------------
//  A. MA Alignment: short-term MAs (MA5, MA9) stacked above/below mid MAs (MA25, MA50)
//     which are stacked above/below long-term MAs (MA100, MA200) — confirms trend direction.
//  B. BB Midline: price is above (bullish) or below (bearish) the Bollinger Band midline (SMA).
//  At least one of A or B must align with the intended trade direction.
//
//  TIER 3 — ENTRY SIGNALS (2 of 4 required; OR 1 of 4 if 3+ fire simultaneously)
//  ----------------------------------------------------------------------------------
//  1. BB Squeeze/Breakout: price breaks outside BB bands after a period of tight compression.
//  2. RSI Signal: RSI divergence, overbought/oversold condition, or midline cross.
//  3. MA Crossover: fast MA crosses slow MA (e.g. MA9 crosses MA25 or MA50).
//  4. Candle Pattern: engulfing, pin bar, or inside bar breakout on the current candle.
//
//  Normal case:      2 of the 4 signals must fire in the same direction.
//  Confluence case:  if 3 or more signals fire simultaneously, only 1 is required.
//
//  TIER 4 — ZONE BONUS (optional enhancer, does NOT block or require a trade)
//  ---------------------------------------------------------------------------
//  Proximity to a supply/demand zone (detected via ZoneLookback swing highs/lows)
//  adds a score bonus. A zone hit increases confidence and may tighten SL placement.
//  Tier 4 never blocks a trade; it only improves quality of trades that already pass Tiers 1–3.
//
//+------------------------------------------------------------------+

#property copyright "TradingBot EA"
#property version   "1.00"
#property strict

#include "include/AssetProfiles.mqh"
#include "include/Signals.mqh"
#include "include/RiskManager.mqh"
#include "include/LiquidityZones.mqh"
#include "include/NewsFilter.mqh"

//+------------------------------------------------------------------+
//| INPUT PARAMETERS                                                 |
//+------------------------------------------------------------------+

// --- General Settings ---
input bool   MasterSwitch          = true;   // Enable/disable the entire EA
input double LotSize               = 0.01;   // Base lot size per trade
input int    MaxOpenTrades         = 3;      // Maximum simultaneous open trades
input int    LockThresholdPips     = 50;     // Pips in profit before lock/hedge activates
input double DailyDrawdownLimitPct = 3.0;   // Max allowed daily drawdown in % of balance
input int    NewsPauseMinutes      = 30;     // Minutes to pause before/after high-impact news

// --- Bollinger Bands Settings ---
input int    BBPeriod    = 20;   // Bollinger Bands period
input double BBDeviation = 2.0;  // Bollinger Bands standard deviation multiplier

// --- RSI Settings ---
input int    RSIPeriod = 14;  // RSI period

// --- Zone Detection ---
input int    ZoneLookback = 100;  // Number of bars to look back for supply/demand zones

// --- Moving Average Periods ---
input int    MA5   = 5;    // MA period 5
input int    MA9   = 9;    // MA period 9
input int    MA25  = 25;   // MA period 25
input int    MA50  = 50;   // MA period 50
input int    MA65  = 65;   // MA period 65
input int    MA100 = 100;  // MA period 100
input int    MA200 = 200;  // MA period 200
input int    MA245 = 245;  // MA period 245

//+------------------------------------------------------------------+
//| GLOBAL RUNTIME VARIABLES                                         |
//| These mirror the inputs and may be overridden by LoadSettingsFromJSON()
//+------------------------------------------------------------------+
bool   g_MasterSwitch          = true;
double g_LotSize               = 0.01;
int    g_MaxOpenTrades         = 3;
int    g_LockThresholdPips     = 50;
double g_DailyDrawdownLimitPct = 3.0;
int    g_NewsPauseMinutes      = 30;
int    g_BBPeriod              = 20;
double g_BBDeviation           = 2.0;
int    g_RSIPeriod             = 14;
int    g_ZoneLookback          = 100;
int    g_MA5                   = 5;
int    g_MA9                   = 9;
int    g_MA25                  = 25;
int    g_MA50                  = 50;
int    g_MA65                  = 65;
int    g_MA100                 = 100;
int    g_MA200                 = 200;
int    g_MA245                 = 245;

// Global IndicatorHandles — populated by InitIndicators() in OnInit
IndicatorHandles g_Handles;

// Tracks when settings were last reloaded from settings.json
datetime g_LastSettingsLoad = 0;
datetime g_LastZoneRebuild  = 0;
datetime g_LastNewsLoad     = 0;

// Legacy individual handle variables (kept for reference; g_Handles is the active store)
int h_MA5   = INVALID_HANDLE;
int h_MA9   = INVALID_HANDLE;
int h_MA25  = INVALID_HANDLE;
int h_MA50  = INVALID_HANDLE;
int h_MA65  = INVALID_HANDLE;
int h_MA100 = INVALID_HANDLE;
int h_MA200 = INVALID_HANDLE;
int h_MA245 = INVALID_HANDLE;
int h_BB    = INVALID_HANDLE;
int h_RSI   = INVALID_HANDLE;

//+------------------------------------------------------------------+
//| HELPER: Extract a raw value string for a given key from JSON.    |
//| Searches for "key": then reads the value up to the next , or }  |
//+------------------------------------------------------------------+
string ExtractJSONValue(const string &json, const string key)
{
   string searchFor = "\"" + key + "\"";
   int keyPos = StringFind(json, searchFor, 0);
   if(keyPos < 0)
      return "";

   // Advance past the key to find the colon
   int colonPos = StringFind(json, ":", keyPos + StringLen(searchFor));
   if(colonPos < 0)
      return "";

   // End of value is whichever comes first: comma or closing brace
   int commaPos = StringFind(json, ",", colonPos + 1);
   int bracePos = StringFind(json, "}", colonPos + 1);

   int endPos;
   if(commaPos < 0 && bracePos < 0)
      return "";
   else if(commaPos < 0)
      endPos = bracePos;
   else if(bracePos < 0)
      endPos = commaPos;
   else
      endPos = (int)MathMin(commaPos, bracePos);

   string raw = StringSubstr(json, colonPos + 1, endPos - colonPos - 1);

   // Trim surrounding whitespace and newlines
   StringTrimLeft(raw);
   StringTrimRight(raw);

   // Strip surrounding quotes if present (string values)
   if(StringLen(raw) >= 2
      && StringGetCharacter(raw, 0) == '"'
      && StringGetCharacter(raw, StringLen(raw) - 1) == '"')
   {
      raw = StringSubstr(raw, 1, StringLen(raw) - 2);
   }

   return raw;
}

//+------------------------------------------------------------------+
//| LoadSettingsFromJSON                                             |
//|                                                                  |
//| Opens settings.json from the MT5 Common Files folder and parses |
//| key-value pairs manually to override the g_* runtime variables. |
//|                                                                  |
//| FILE_COMMON = %APPDATA%\MetaQuotes\Terminal\Common\Files\        |
//| Remove FILE_COMMON to use the terminal's local MQL5\Files\ path.|
//+------------------------------------------------------------------+
void LoadSettingsFromJSON()
{
   int handle = FileOpen("settings.json", FILE_READ | FILE_TXT | FILE_COMMON);
   if(handle == INVALID_HANDLE)
   {
      Print("[Settings] settings.json not found — using input/default values.");
      return;
   }

   // Read entire file content as one string
   string json = "";
   while(!FileIsEnding(handle))
      json += FileReadString(handle);
   FileClose(handle);

   // Parse each key and override the corresponding runtime variable
   string val;

   val = ExtractJSONValue(json, "MasterSwitch");
   if(val != "") g_MasterSwitch = (val == "true");

   val = ExtractJSONValue(json, "LotSize");
   if(val != "") g_LotSize = StringToDouble(val);

   val = ExtractJSONValue(json, "MaxOpenTrades");
   if(val != "") g_MaxOpenTrades = (int)StringToInteger(val);

   val = ExtractJSONValue(json, "LockThresholdPips");
   if(val != "") g_LockThresholdPips = (int)StringToInteger(val);

   val = ExtractJSONValue(json, "DailyDrawdownLimitPct");
   if(val != "") g_DailyDrawdownLimitPct = StringToDouble(val);

   val = ExtractJSONValue(json, "NewsPauseMinutes");
   if(val != "") g_NewsPauseMinutes = (int)StringToInteger(val);

   val = ExtractJSONValue(json, "BBPeriod");
   if(val != "") g_BBPeriod = (int)StringToInteger(val);

   val = ExtractJSONValue(json, "BBDeviation");
   if(val != "") g_BBDeviation = StringToDouble(val);

   val = ExtractJSONValue(json, "RSIPeriod");
   if(val != "") g_RSIPeriod = (int)StringToInteger(val);

   val = ExtractJSONValue(json, "ZoneLookback");
   if(val != "") g_ZoneLookback = (int)StringToInteger(val);

   val = ExtractJSONValue(json, "MA5");
   if(val != "") g_MA5 = (int)StringToInteger(val);

   val = ExtractJSONValue(json, "MA9");
   if(val != "") g_MA9 = (int)StringToInteger(val);

   val = ExtractJSONValue(json, "MA25");
   if(val != "") g_MA25 = (int)StringToInteger(val);

   val = ExtractJSONValue(json, "MA50");
   if(val != "") g_MA50 = (int)StringToInteger(val);

   val = ExtractJSONValue(json, "MA65");
   if(val != "") g_MA65 = (int)StringToInteger(val);

   val = ExtractJSONValue(json, "MA100");
   if(val != "") g_MA100 = (int)StringToInteger(val);

   val = ExtractJSONValue(json, "MA200");
   if(val != "") g_MA200 = (int)StringToInteger(val);

   val = ExtractJSONValue(json, "MA245");
   if(val != "") g_MA245 = (int)StringToInteger(val);

   Print("[Settings] Settings loaded from settings.json");
}

//+------------------------------------------------------------------+
//| OnInit                                                           |
//+------------------------------------------------------------------+
int OnInit()
{
   LoadSettingsFromJSON();

   g_Handles = InitIndicators(_Symbol,
      g_MA5, g_MA9, g_MA25, g_MA50, g_MA65, g_MA100, g_MA200, g_MA245,
      g_BBPeriod, g_BBDeviation, g_RSIPeriod);
   BuildLiquidityZones(_Symbol, PERIOD_H1, g_ZoneLookback);
   LoadNewsFromJSON();

   // Validate critical M1 handles — fail init if any are broken
   if(g_Handles.RSI_M1   == INVALID_HANDLE ||
      g_Handles.BB_M1    == INVALID_HANDLE ||
      g_Handles.MA9_M1   == INVALID_HANDLE ||
      g_Handles.MA50_M1  == INVALID_HANDLE)
   {
      Print("[Init] Critical indicator handle failed — EA will not run.");
      return(INIT_FAILED);
   }

   Print("[Init] TradingBot EA initialized on ", _Symbol);
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| OnDeinit                                                         |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   ReleaseIndicators(g_Handles);
   Print("[Deinit] TradingBot EA removed. Reason: ", reason);
}

//+------------------------------------------------------------------+
//| OnTick                                                           |
//+------------------------------------------------------------------+
void OnTick()
{
   if(!g_MasterSwitch)
      return;

   // Sync position records at the top of every tick
   SyncOpenTrades();

   // Reload settings from settings.json every 60 seconds
   if(TimeCurrent() - g_LastSettingsLoad >= 60)
   {
      LoadSettingsFromJSON();
      g_LastSettingsLoad = TimeCurrent();
   }

   // Rebuild liquidity zones every 4 hours
   if(TimeCurrent() - g_LastZoneRebuild >= 4 * 3600)
   {
      BuildLiquidityZones(_Symbol, PERIOD_H1, g_ZoneLookback);
      g_LastZoneRebuild = TimeCurrent();
   }

   // Reload news events every 30 minutes
   if(TimeCurrent() - g_LastNewsLoad >= 30 * 60)
   {
      LoadNewsFromJSON();
      g_LastNewsLoad = TimeCurrent();
   }

   // Daily drawdown — computed from today's closed deal history vs. current equity
   double dailyDrawdownPct = GetDailyDrawdownPct();

   // Asset profile and current open trade count for this symbol
   AssetProfile profile  = GetAssetProfile(_Symbol);
   int openTradeCount    = CountOpenTrades(_Symbol);

   // Evaluate entry signal through Tiers 1–3
   SignalResult sig = EvaluateEntry(
      _Symbol,
      g_Handles,
      profile,
      g_MasterSwitch,
      openTradeCount,
      g_MaxOpenTrades,
      IsNewsActive(_Symbol, g_NewsPauseMinutes),
      dailyDrawdownPct,
      g_DailyDrawdownLimitPct
   );

   if(sig.direction == 1)
      Print("[Trade] BUY signal confirmed | ", sig.reason);
   else if(sig.direction == -1)
      Print("[Trade] SELL signal confirmed | ", sig.reason);

   // Zone bonus check — must run before OpenTrade so lots can be adjusted
   double zoneStrength = 0.0;
   sig.zoneBonus = IsNearZone(_Symbol, sig.direction,
                              SymbolInfoDouble(_Symbol, SYMBOL_BID), zoneStrength);

   // Open trade when a valid signal is produced
   if(sig.direction != 0)
   {
      double lots   = CalculateLotSize(_Symbol, g_LotSize, profile);

      // Zone bonus: high-confluence trade near a key zone gets larger size
      if(sig.zoneBonus && sig.tier3Score >= 3)
      {
         lots = MathMin(lots * 1.5, 0.03);
         Print("[Trade] Zone bonus applied — lots=", lots);
      }
      double sl     = CalculateStopLoss(_Symbol, sig.direction, g_Handles);
      double tp     = CalculateTakeProfit(_Symbol, sig.direction, g_Handles);
      ulong  ticket = OpenTrade(_Symbol, sig.direction, lots, sl, tp, "TradingBot");

      // Re-sync immediately so the new position is captured in openTrades[]
      if(ticket > 0)
         SyncOpenTrades();
   }

   ManageAllTrades(_Symbol, g_Handles, profile, g_LockThresholdPips);
   Print("[Debug] OnTick fired, calling WriteTradesJSON");
   WriteTradesJSON();
}

//+------------------------------------------------------------------+
//| CheckEntrySignals                                                |
//| Returns: positive score = BUY signal, negative = SELL, 0 = none |
//+------------------------------------------------------------------+
int CheckEntrySignals()
{
   // TODO (next prompt): Implement the full 4-tier scoring system:
   //
   //   Tier 1 — Hard gates (all must pass or return 0):
   //     - Compare current balance vs. day-start balance for drawdown check.
   //     - Read news_events.json to check for imminent high-impact events.
   //     - Check session hours based on asset profile's useSessionFilter flag.
   //
   //   Tier 2 — Directional bias (at least 1 of 2 must confirm):
   //     - MA Alignment: CopyBuffer() from h_MA5..h_MA200, check stacking order.
   //     - BB Midline: CopyBuffer() from h_BB for the middle band, compare to close price.
   //
   //   Tier 3 — Entry signals (2 of 4, or 1 if 3+ fire):
   //     - BB squeeze/breakout: band width below threshold then price closes outside band.
   //     - RSI signal: CopyBuffer() from h_RSI, check OB/OS levels or divergence.
   //     - MA crossover: compare current vs. previous bar MA values for a cross event.
   //     - Candle pattern: analyse iOpen/iHigh/iLow/iClose for pin bar or engulfing.
   //
   //   Tier 4 — Zone bonus:
   //     - Scan g_ZoneLookback bars for swing highs/lows within a tolerance band.
   //     - If current price is within the zone, add +1 to the score (does not gate entry).
   //
   //   Return the final signed score.

   return 0; // placeholder — no signal
}

//+------------------------------------------------------------------+
//| ManageOpenTrades                                                 |
//+------------------------------------------------------------------+
void ManageOpenTrades()
{
   // TODO (next prompt): Iterate over all open positions filtered by this EA's magic number.
   //   For each position:
   //   - Calculate profit in pips using the asset profile's pipMultiplier.
   //   - If profit >= g_LockThresholdPips: move SL to breakeven (lock).
   //   - If trailing stop logic is active: adjust SL to trail price.
   //   - If partial TP level is reached: close a fraction of the position volume.
   //   - If hedge mode triggers (locked trade moves against): open a counter-position
   //     at reduced lot size to neutralise further drawdown.
   //   - Log any order modifications using OrderSend() with a descriptive comment.
}

//+------------------------------------------------------------------+
//| WriteCandleData                                                  |
//| Returns a JSON array string of OHLCV candles for symbol/tf.     |
//+------------------------------------------------------------------+
string WriteCandleData(string symbol, ENUM_TIMEFRAMES tf, int count)
{
   Print("[Debug] WriteCandleData called for ", symbol, " count=", count);
   MqlRates rates[];
   int copied = CopyRates(symbol, tf, 0, count, rates);
   Print("[Debug] CopyRates returned: ", copied, " bars");

   if(copied <= 0)
      return "[]";

   string json = "[\n";
   for(int i = 0; i < copied; i++)
   {
      json += "    {";
      json += "\"t\":" + IntegerToString((long)rates[i].time)    + ",";
      json += "\"o\":" + DoubleToString(rates[i].open,  _Digits) + ",";
      json += "\"h\":" + DoubleToString(rates[i].high,  _Digits) + ",";
      json += "\"l\":" + DoubleToString(rates[i].low,   _Digits) + ",";
      json += "\"c\":" + DoubleToString(rates[i].close, _Digits) + ",";
      json += "\"v\":" + IntegerToString(rates[i].tick_volume)   + "}";
      json += (i < copied - 1) ? ",\n" : "\n";
   }
   json += "  ]";
   Print("[Debug] Candle data write complete");
   return json;
}

//+------------------------------------------------------------------+
//| WriteTradesJSON                                                  |
//| Writes all open trade records plus account meta to trades.json  |
//| in the MT5 Common Files folder.  The Python bridge reads this   |
//| file on every poll cycle to populate the frontend dashboard.    |
//+------------------------------------------------------------------+
void WriteTradesJSON()
{
   Print("[Debug] WriteTradesJSON called");
   int fh = FileOpen("trades.json", FILE_WRITE | FILE_TXT | FILE_COMMON);
   Print("[Debug] File open result: ", fh);
   if(fh == INVALID_HANDLE)
   {
      Print("[Debug] FAILED to open trades.json for writing. Error: ", GetLastError());
      Print("[TradesJSON] Failed to open trades.json for writing");
      return;
   }

   double drawdown = GetDailyDrawdownPct();
   double equity   = AccountInfoDouble(ACCOUNT_EQUITY);
   double balance  = AccountInfoDouble(ACCOUNT_BALANCE);

   FileWriteString(fh, "{\n");
   FileWriteString(fh, "  \"meta\": {\n");
   FileWriteString(fh, "    \"dailyDrawdownPct\": " + DoubleToString(drawdown, 4) + ",\n");
   FileWriteString(fh, "    \"accountEquity\": "    + DoubleToString(equity,   2) + ",\n");
   FileWriteString(fh, "    \"accountBalance\": "   + DoubleToString(balance,  2) + "\n");
   FileWriteString(fh, "  },\n");
   FileWriteString(fh, "  \"trades\": [\n");

   int n = ArraySize(openTrades);
   for(int i = 0; i < n; i++)
   {
      TradeRecord r = openTrades[i];
      FileWriteString(fh, "    {\n");
      FileWriteString(fh, "      \"ticket\": "      + IntegerToString(r.ticket)                       + ",\n");
      FileWriteString(fh, "      \"symbol\": \""    + r.symbol                                        + "\",\n");
      FileWriteString(fh, "      \"direction\": "   + IntegerToString(r.direction)                    + ",\n");
      FileWriteString(fh, "      \"lotSize\": "     + DoubleToString(r.lotSize,    2)                 + ",\n");
      FileWriteString(fh, "      \"entryPrice\": "  + DoubleToString(r.entryPrice, 5)                 + ",\n");
      FileWriteString(fh, "      \"stopLoss\": "    + DoubleToString(r.stopLoss,   5)                 + ",\n");
      FileWriteString(fh, "      \"takeProfit\": "  + DoubleToString(r.takeProfit, 5)                 + ",\n");
      FileWriteString(fh, "      \"worstPrice\": "  + DoubleToString(r.worstPrice, 5)                 + ",\n");
      FileWriteString(fh, "      \"isLocked\": "    + (r.isLocked ? "true" : "false")                 + ",\n");
      FileWriteString(fh, "      \"hedgeTicket\": " + IntegerToString(r.hedgeTicket)                  + ",\n");
      FileWriteString(fh, "      \"openTime\": \""  + TimeToString(r.openTime, TIME_DATE|TIME_SECONDS) + "\"\n");
      FileWriteString(fh, (i < n - 1) ? "    },\n" : "    }\n");
   }

   FileWriteString(fh, "  ],\n");
   Print("[Debug] About to write candle data for symbol: ", _Symbol, " TF: ", Period(), " Bars available: ", Bars(_Symbol, Period()));
   string candleJson = WriteCandleData(_Symbol, PERIOD_M15, 200);
   Print("[Debug] candles JSON length: ", StringLen(candleJson));
   FileWriteString(fh, "  \"candles\": " + candleJson + "\n");
   FileWriteString(fh, "}\n");
   FileClose(fh);
   Print("[Debug] Wrote trades.json successfully");
   Print("[TradesJSON] trades.json updated (", n, " trades)");
}

//+------------------------------------------------------------------+
