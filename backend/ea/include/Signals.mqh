//+------------------------------------------------------------------+
//|                                                     Signals.mqh |
//|  Indicator handle management, candle utilities, and signal      |
//|  detection building blocks for TradingBot.mq5                  |
//+------------------------------------------------------------------+
#ifndef SIGNALS_MQH
#define SIGNALS_MQH

#include "AssetProfiles.mqh"

//+------------------------------------------------------------------+
//| CandleData                                                       |
//| Pre-computed OHLC + derived measurements for a single candle.   |
//+------------------------------------------------------------------+
struct CandleData
{
   double open;
   double high;
   double low;
   double close;
   double body;       // MathAbs(close - open)
   double upperWick;  // high  - MathMax(open, close)
   double lowerWick;  // MathMin(open, close) - low
   bool   isBullish;  // close > open
   bool   isBearish;  // close < open
};

//+------------------------------------------------------------------+
//| GetCandleData                                                    |
//| Returns a populated CandleData struct for the candle at `shift` |
//+------------------------------------------------------------------+
CandleData GetCandleData(string symbol, ENUM_TIMEFRAMES tf, int shift)
{
   CandleData c;
   c.open  = iOpen (symbol, tf, shift);
   c.high  = iHigh (symbol, tf, shift);
   c.low   = iLow  (symbol, tf, shift);
   c.close = iClose(symbol, tf, shift);

   c.body      = MathAbs(c.close - c.open);
   c.upperWick = c.high - MathMax(c.open, c.close);
   c.lowerWick = MathMin(c.open, c.close) - c.low;
   c.isBullish = (c.close > c.open);
   c.isBearish = (c.close < c.open);

   return c;
}

//+------------------------------------------------------------------+
//| IndicatorHandles                                                 |
//| All indicator handles used by the EA.                           |
//|                                                                  |
//| MA handles: 8 periods × 3 timeframes (M1, H4, D1) = 24 handles |
//| BB handles: 3 timeframes (M1, M15, M30)             =  3 handles|
//| RSI handle: M1 only                                 =  1 handle |
//| Total: 28 handles                                               |
//+------------------------------------------------------------------+
struct IndicatorHandles
{
   // --- Moving Averages on M1 ---
   int MA5_M1;
   int MA9_M1;
   int MA25_M1;
   int MA50_M1;
   int MA65_M1;
   int MA100_M1;
   int MA200_M1;
   int MA245_M1;

   // --- Moving Averages on H4 ---
   int MA5_H4;
   int MA9_H4;
   int MA25_H4;
   int MA50_H4;
   int MA65_H4;
   int MA100_H4;
   int MA200_H4;
   int MA245_H4;

   // --- Moving Averages on D1 ---
   int MA5_D1;
   int MA9_D1;
   int MA25_D1;
   int MA50_D1;
   int MA65_D1;
   int MA100_D1;
   int MA200_D1;
   int MA245_D1;

   // --- Bollinger Bands ---
   int BB_M1;
   int BB_M15;
   int BB_M30;

   // --- RSI ---
   int RSI_M1;
};

//+------------------------------------------------------------------+
//| InitIndicators                                                   |
//| Creates all indicator handles for the given symbol.             |
//| References g_* runtime globals declared in TradingBot.mq5.      |
//| Logs an error for each failed handle but does NOT abort —       |
//| the caller in OnInit() validates critical handles.              |
//+------------------------------------------------------------------+
IndicatorHandles InitIndicators(string symbol,
   int ma5, int ma9, int ma25, int ma50,
   int ma65, int ma100, int ma200, int ma245,
   int bbPeriod, double bbDeviation, int rsiPeriod)
{
   IndicatorHandles h;

   // ----------------------------------------------------------------
   // Moving Averages — M1
   // ----------------------------------------------------------------
   h.MA5_M1   = iMA(symbol, PERIOD_M1, ma5,   0, MODE_EMA, PRICE_CLOSE);
   h.MA9_M1   = iMA(symbol, PERIOD_M1, ma9,   0, MODE_EMA, PRICE_CLOSE);
   h.MA25_M1  = iMA(symbol, PERIOD_M1, ma25,  0, MODE_EMA, PRICE_CLOSE);
   h.MA50_M1  = iMA(symbol, PERIOD_M1, ma50,  0, MODE_EMA, PRICE_CLOSE);
   h.MA65_M1  = iMA(symbol, PERIOD_M1, ma65,  0, MODE_EMA, PRICE_CLOSE);
   h.MA100_M1 = iMA(symbol, PERIOD_M1, ma100, 0, MODE_EMA, PRICE_CLOSE);
   h.MA200_M1 = iMA(symbol, PERIOD_M1, ma200, 0, MODE_EMA, PRICE_CLOSE);
   h.MA245_M1 = iMA(symbol, PERIOD_M1, ma245, 0, MODE_EMA, PRICE_CLOSE);

   if(h.MA5_M1   == INVALID_HANDLE) Print("[Signals] Failed: MA5_M1");
   if(h.MA9_M1   == INVALID_HANDLE) Print("[Signals] Failed: MA9_M1");
   if(h.MA25_M1  == INVALID_HANDLE) Print("[Signals] Failed: MA25_M1");
   if(h.MA50_M1  == INVALID_HANDLE) Print("[Signals] Failed: MA50_M1");
   if(h.MA65_M1  == INVALID_HANDLE) Print("[Signals] Failed: MA65_M1");
   if(h.MA100_M1 == INVALID_HANDLE) Print("[Signals] Failed: MA100_M1");
   if(h.MA200_M1 == INVALID_HANDLE) Print("[Signals] Failed: MA200_M1");
   if(h.MA245_M1 == INVALID_HANDLE) Print("[Signals] Failed: MA245_M1");

   // ----------------------------------------------------------------
   // Moving Averages — H4
   // ----------------------------------------------------------------
   h.MA5_H4   = iMA(symbol, PERIOD_H4, ma5,   0, MODE_EMA, PRICE_CLOSE);
   h.MA9_H4   = iMA(symbol, PERIOD_H4, ma9,   0, MODE_EMA, PRICE_CLOSE);
   h.MA25_H4  = iMA(symbol, PERIOD_H4, ma25,  0, MODE_EMA, PRICE_CLOSE);
   h.MA50_H4  = iMA(symbol, PERIOD_H4, ma50,  0, MODE_EMA, PRICE_CLOSE);
   h.MA65_H4  = iMA(symbol, PERIOD_H4, ma65,  0, MODE_EMA, PRICE_CLOSE);
   h.MA100_H4 = iMA(symbol, PERIOD_H4, ma100, 0, MODE_EMA, PRICE_CLOSE);
   h.MA200_H4 = iMA(symbol, PERIOD_H4, ma200, 0, MODE_EMA, PRICE_CLOSE);
   h.MA245_H4 = iMA(symbol, PERIOD_H4, ma245, 0, MODE_EMA, PRICE_CLOSE);

   if(h.MA5_H4   == INVALID_HANDLE) Print("[Signals] Failed: MA5_H4");
   if(h.MA9_H4   == INVALID_HANDLE) Print("[Signals] Failed: MA9_H4");
   if(h.MA25_H4  == INVALID_HANDLE) Print("[Signals] Failed: MA25_H4");
   if(h.MA50_H4  == INVALID_HANDLE) Print("[Signals] Failed: MA50_H4");
   if(h.MA65_H4  == INVALID_HANDLE) Print("[Signals] Failed: MA65_H4");
   if(h.MA100_H4 == INVALID_HANDLE) Print("[Signals] Failed: MA100_H4");
   if(h.MA200_H4 == INVALID_HANDLE) Print("[Signals] Failed: MA200_H4");
   if(h.MA245_H4 == INVALID_HANDLE) Print("[Signals] Failed: MA245_H4");

   // ----------------------------------------------------------------
   // Moving Averages — D1
   // ----------------------------------------------------------------
   h.MA5_D1   = iMA(symbol, PERIOD_D1, ma5,   0, MODE_EMA, PRICE_CLOSE);
   h.MA9_D1   = iMA(symbol, PERIOD_D1, ma9,   0, MODE_EMA, PRICE_CLOSE);
   h.MA25_D1  = iMA(symbol, PERIOD_D1, ma25,  0, MODE_EMA, PRICE_CLOSE);
   h.MA50_D1  = iMA(symbol, PERIOD_D1, ma50,  0, MODE_EMA, PRICE_CLOSE);
   h.MA65_D1  = iMA(symbol, PERIOD_D1, ma65,  0, MODE_EMA, PRICE_CLOSE);
   h.MA100_D1 = iMA(symbol, PERIOD_D1, ma100, 0, MODE_EMA, PRICE_CLOSE);
   h.MA200_D1 = iMA(symbol, PERIOD_D1, ma200, 0, MODE_EMA, PRICE_CLOSE);
   h.MA245_D1 = iMA(symbol, PERIOD_D1, ma245, 0, MODE_EMA, PRICE_CLOSE);

   if(h.MA5_D1   == INVALID_HANDLE) Print("[Signals] Failed: MA5_D1");
   if(h.MA9_D1   == INVALID_HANDLE) Print("[Signals] Failed: MA9_D1");
   if(h.MA25_D1  == INVALID_HANDLE) Print("[Signals] Failed: MA25_D1");
   if(h.MA50_D1  == INVALID_HANDLE) Print("[Signals] Failed: MA50_D1");
   if(h.MA65_D1  == INVALID_HANDLE) Print("[Signals] Failed: MA65_D1");
   if(h.MA100_D1 == INVALID_HANDLE) Print("[Signals] Failed: MA100_D1");
   if(h.MA200_D1 == INVALID_HANDLE) Print("[Signals] Failed: MA200_D1");
   if(h.MA245_D1 == INVALID_HANDLE) Print("[Signals] Failed: MA245_D1");

   // ----------------------------------------------------------------
   // Bollinger Bands — M1, M15, M30
   // Shift parameter = 0 (no horizontal shift applied to the bands)
   // ----------------------------------------------------------------
   h.BB_M1  = iBands(symbol, PERIOD_M1,  bbPeriod, 0, bbDeviation, PRICE_CLOSE);
   h.BB_M15 = iBands(symbol, PERIOD_M15, bbPeriod, 0, bbDeviation, PRICE_CLOSE);
   h.BB_M30 = iBands(symbol, PERIOD_M30, bbPeriod, 0, bbDeviation, PRICE_CLOSE);

   if(h.BB_M1  == INVALID_HANDLE) Print("[Signals] Failed: BB_M1");
   if(h.BB_M15 == INVALID_HANDLE) Print("[Signals] Failed: BB_M15");
   if(h.BB_M30 == INVALID_HANDLE) Print("[Signals] Failed: BB_M30");

   // ----------------------------------------------------------------
   // RSI — M1
   // ----------------------------------------------------------------
   h.RSI_M1 = iRSI(symbol, PERIOD_M1, rsiPeriod, PRICE_CLOSE);
   if(h.RSI_M1 == INVALID_HANDLE) Print("[Signals] Failed: RSI_M1");

   Print("[Signals] Indicator handles initialised for ", symbol);
   return h;
}

//+------------------------------------------------------------------+
//| ReleaseIndicators                                                |
//| Safely releases all 28 indicator handles.                       |
//+------------------------------------------------------------------+
void ReleaseIndicators(IndicatorHandles &h)
{
   // MA — M1
   if(h.MA5_M1   != INVALID_HANDLE) IndicatorRelease(h.MA5_M1);
   if(h.MA9_M1   != INVALID_HANDLE) IndicatorRelease(h.MA9_M1);
   if(h.MA25_M1  != INVALID_HANDLE) IndicatorRelease(h.MA25_M1);
   if(h.MA50_M1  != INVALID_HANDLE) IndicatorRelease(h.MA50_M1);
   if(h.MA65_M1  != INVALID_HANDLE) IndicatorRelease(h.MA65_M1);
   if(h.MA100_M1 != INVALID_HANDLE) IndicatorRelease(h.MA100_M1);
   if(h.MA200_M1 != INVALID_HANDLE) IndicatorRelease(h.MA200_M1);
   if(h.MA245_M1 != INVALID_HANDLE) IndicatorRelease(h.MA245_M1);

   // MA — H4
   if(h.MA5_H4   != INVALID_HANDLE) IndicatorRelease(h.MA5_H4);
   if(h.MA9_H4   != INVALID_HANDLE) IndicatorRelease(h.MA9_H4);
   if(h.MA25_H4  != INVALID_HANDLE) IndicatorRelease(h.MA25_H4);
   if(h.MA50_H4  != INVALID_HANDLE) IndicatorRelease(h.MA50_H4);
   if(h.MA65_H4  != INVALID_HANDLE) IndicatorRelease(h.MA65_H4);
   if(h.MA100_H4 != INVALID_HANDLE) IndicatorRelease(h.MA100_H4);
   if(h.MA200_H4 != INVALID_HANDLE) IndicatorRelease(h.MA200_H4);
   if(h.MA245_H4 != INVALID_HANDLE) IndicatorRelease(h.MA245_H4);

   // MA — D1
   if(h.MA5_D1   != INVALID_HANDLE) IndicatorRelease(h.MA5_D1);
   if(h.MA9_D1   != INVALID_HANDLE) IndicatorRelease(h.MA9_D1);
   if(h.MA25_D1  != INVALID_HANDLE) IndicatorRelease(h.MA25_D1);
   if(h.MA50_D1  != INVALID_HANDLE) IndicatorRelease(h.MA50_D1);
   if(h.MA65_D1  != INVALID_HANDLE) IndicatorRelease(h.MA65_D1);
   if(h.MA100_D1 != INVALID_HANDLE) IndicatorRelease(h.MA100_D1);
   if(h.MA200_D1 != INVALID_HANDLE) IndicatorRelease(h.MA200_D1);
   if(h.MA245_D1 != INVALID_HANDLE) IndicatorRelease(h.MA245_D1);

   // BB
   if(h.BB_M1  != INVALID_HANDLE) IndicatorRelease(h.BB_M1);
   if(h.BB_M15 != INVALID_HANDLE) IndicatorRelease(h.BB_M15);
   if(h.BB_M30 != INVALID_HANDLE) IndicatorRelease(h.BB_M30);

   // RSI
   if(h.RSI_M1 != INVALID_HANDLE) IndicatorRelease(h.RSI_M1);

   Print("[Signals] All indicator handles released.");
}

//+------------------------------------------------------------------+
//| GetMAValue                                                       |
//| Returns the MA value at `shift` from `handle`.                  |
//| Returns -1.0 and logs an error if CopyBuffer fails.             |
//+------------------------------------------------------------------+
double GetMAValue(int handle, int shift)
{
   double buf[1];
   if(CopyBuffer(handle, 0, shift, 1, buf) != 1)
   {
      Print("[Signals] GetMAValue failed — handle: ", handle,
            "  shift: ", shift, "  error: ", GetLastError());
      return -1.0;
   }
   return buf[0];
}

//+------------------------------------------------------------------+
//| GetBBValues                                                      |
//| Populates upper, middle, lower by reference from a BB handle.   |
//| Returns true on success, false on any CopyBuffer failure.       |
//|                                                                  |
//| MT5 iBands buffer indices:                                       |
//|   0 = BASE_LINE (middle / SMA)                                  |
//|   1 = UPPER_BAND                                                 |
//|   2 = LOWER_BAND                                                 |
//+------------------------------------------------------------------+
bool GetBBValues(int handle, int shift, double &upper, double &middle, double &lower)
{
   double bufU[1], bufM[1], bufL[1];

   if(CopyBuffer(handle, 1, shift, 1, bufU) != 1)
   {
      Print("[Signals] GetBBValues failed (upper) — handle: ", handle,
            "  error: ", GetLastError());
      return false;
   }
   if(CopyBuffer(handle, 0, shift, 1, bufM) != 1)
   {
      Print("[Signals] GetBBValues failed (middle) — handle: ", handle,
            "  error: ", GetLastError());
      return false;
   }
   if(CopyBuffer(handle, 2, shift, 1, bufL) != 1)
   {
      Print("[Signals] GetBBValues failed (lower) — handle: ", handle,
            "  error: ", GetLastError());
      return false;
   }

   upper  = bufU[0];
   middle = bufM[0];
   lower  = bufL[0];
   return true;
}

//+------------------------------------------------------------------+
//| IsBullishEngulfing                                               |
//| True if candle[shift] is a bullish engulfing of candle[shift+1] |
//+------------------------------------------------------------------+
bool IsBullishEngulfing(string symbol, ENUM_TIMEFRAMES tf, int shift)
{
   CandleData curr = GetCandleData(symbol, tf, shift);
   CandleData prev = GetCandleData(symbol, tf, shift + 1);

   if(!curr.isBullish)         return false;
   if(curr.body <= prev.body)  return false;

   // Open at or below prev close; close at or above prev open
   if(curr.open  > prev.close) return false;
   if(curr.close < prev.open)  return false;

   return true;
}

//+------------------------------------------------------------------+
//| IsBearishEngulfing                                               |
//| True if candle[shift] is a bearish engulfing of candle[shift+1] |
//+------------------------------------------------------------------+
bool IsBearishEngulfing(string symbol, ENUM_TIMEFRAMES tf, int shift)
{
   CandleData curr = GetCandleData(symbol, tf, shift);
   CandleData prev = GetCandleData(symbol, tf, shift + 1);

   if(!curr.isBearish)         return false;
   if(curr.body <= prev.body)  return false;

   // Open at or above prev close; close at or below prev open
   if(curr.open  < prev.close) return false;
   if(curr.close > prev.open)  return false;

   return true;
}

//+------------------------------------------------------------------+
//| IsBullishPinBar                                                  |
//| Long lower wick signals rejection of lows.                      |
//| Requires: lowerWick >= 2.5× body, upperWick < body, bullish.    |
//+------------------------------------------------------------------+
bool IsBullishPinBar(string symbol, ENUM_TIMEFRAMES tf, int shift)
{
   CandleData c = GetCandleData(symbol, tf, shift);

   if(!c.isBullish)        return false;
   if(c.body <= _Point)    return false;  // Guard zero-body / doji

   if(c.lowerWick < 2.5 * c.body) return false;
   if(c.upperWick >= c.body)       return false;

   return true;
}

//+------------------------------------------------------------------+
//| IsBearishPinBar                                                  |
//| Long upper wick signals rejection of highs.                     |
//| Requires: upperWick >= 2.5× body, lowerWick < body, bearish.    |
//+------------------------------------------------------------------+
bool IsBearishPinBar(string symbol, ENUM_TIMEFRAMES tf, int shift)
{
   CandleData c = GetCandleData(symbol, tf, shift);

   if(!c.isBearish)        return false;
   if(c.body <= _Point)    return false;  // Guard zero-body / doji

   if(c.upperWick < 2.5 * c.body) return false;
   if(c.lowerWick >= c.body)       return false;

   return true;
}

//+------------------------------------------------------------------+
//| CountConfirmationCandles                                         |
//| Counts consecutive candles AFTER the signal candle (i.e. more   |
//| recent, lower shift values) that closed in the signal direction. |
//| Stops at the first candle that breaks the streak.               |
//+------------------------------------------------------------------+
int CountConfirmationCandles(string symbol, ENUM_TIMEFRAMES tf,
                             int signalShift, bool bullish)
{
   int    count       = 0;
   double signalClose = iClose(symbol, tf, signalShift);

   // signalShift-1 is the first candle after the signal (more recent)
   for(int i = signalShift - 1; i >= 1; i--)
   {
      double candleClose = iClose(symbol, tf, i);
      bool   confirms    = bullish ? (candleClose > signalClose)
                                   : (candleClose < signalClose);
      if(!confirms) break;
      count++;
   }

   return count;
}

//+------------------------------------------------------------------+
//| IsHTFBullish                                                     |
//| H4 close is above MA50_H4 OR above MA100_H4.                    |
//| A failed GetMAValue (-1) is treated as non-confirming.          |
//+------------------------------------------------------------------+
bool IsHTFBullish(string symbol, IndicatorHandles &handles)
{
   double h4Close  = iClose(symbol, PERIOD_H4, 1);
   double ma50_h4  = GetMAValue(handles.MA50_H4,  1);
   double ma100_h4 = GetMAValue(handles.MA100_H4, 1);

   bool aboveMA50  = (ma50_h4  > 0.0) && (h4Close > ma50_h4);
   bool aboveMA100 = (ma100_h4 > 0.0) && (h4Close > ma100_h4);

   return (aboveMA50 || aboveMA100);
}

//+------------------------------------------------------------------+
//| IsHTFBearish                                                     |
//| H4 close is below MA50_H4 OR below MA100_H4.                    |
//| A failed GetMAValue (-1) is treated as non-confirming.          |
//+------------------------------------------------------------------+
bool IsHTFBearish(string symbol, IndicatorHandles &handles)
{
   double h4Close  = iClose(symbol, PERIOD_H4, 1);
   double ma50_h4  = GetMAValue(handles.MA50_H4,  1);
   double ma100_h4 = GetMAValue(handles.MA100_H4, 1);

   bool belowMA50  = (ma50_h4  > 0.0) && (h4Close < ma50_h4);
   bool belowMA100 = (ma100_h4 > 0.0) && (h4Close < ma100_h4);

   return (belowMA50 || belowMA100);
}

//+------------------------------------------------------------------+
//| SignalResult                                                     |
//| Returned by EvaluateEntry() to describe the full signal state.  |
//+------------------------------------------------------------------+
struct SignalResult
{
   int    direction;     // 1 = BUY, -1 = SELL, 0 = no trade
   int    tier3Score;    // number of Tier 3 signals that fired (0–4)
   bool   zoneBonus;     // true if price is near a supply/demand zone (Tier 4)
   bool   flexibleEntry; // true if tier3Score >= 3 (1 confirmation candle is enough)
   string reason;        // human-readable description of which signals fired
};

//+------------------------------------------------------------------+
//| CheckTier1Gates                                                  |
//| Hard gates — all must pass for a trade to be opened.            |
//| Logs the reason for any failure.                                 |
//+------------------------------------------------------------------+
bool CheckTier1Gates(string       symbol,
                     AssetProfile &profile,
                     int           spreadLimit,
                     bool          masterSwitch,
                     int           openTradeCount,
                     int           maxOpenTrades,
                     bool          newsActive,
                     double        dailyDrawdownPct,
                     double        dailyDrawdownLimit)
{
   if(!masterSwitch)
   {
      Print("[Tier1] FAIL: MasterSwitch is OFF");
      return false;
   }

   if(openTradeCount >= maxOpenTrades)
   {
      Print("[Tier1] FAIL: MaxOpenTrades reached (", openTradeCount,
            "/", maxOpenTrades, ")");
      return false;
   }

   if(newsActive && profile.useNewsFilter)
   {
      Print("[Tier1] FAIL: News filter active — trade paused");
      return false;
   }

   long currentSpread = SymbolInfoInteger(symbol, SYMBOL_SPREAD);
   if(currentSpread > (long)spreadLimit)
   {
      Print("[Tier1] FAIL: Spread too wide (", currentSpread,
            " > limit ", spreadLimit, ")");
      return false;
   }

   if(dailyDrawdownPct >= dailyDrawdownLimit)
   {
      Print("[Tier1] FAIL: Daily drawdown limit reached (",
            DoubleToString(dailyDrawdownPct, 2), "% >= ",
            dailyDrawdownLimit, "%)");
      return false;
   }

   Print("[Tier1] PASS");
   return true;
}

//+------------------------------------------------------------------+
//| CheckTier2Bias                                                   |
//| Determines directional bias from higher timeframes.             |
//| Returns: 1 = bullish, -1 = bearish, 0 = no clear / conflicting  |
//+------------------------------------------------------------------+
int CheckTier2Bias(string symbol, IndicatorHandles &handles)
{
   // --- Condition 1: H4 price vs MA100_H4 AND MA200_H4 ---
   double h4Close  = iClose(symbol, PERIOD_H4, 1);
   double ma100_h4 = GetMAValue(handles.MA100_H4, 1);
   double ma200_h4 = GetMAValue(handles.MA200_H4, 1);

   // A failed read (-1) means condition cannot be assessed; treat as false
   bool bullish1 = (ma100_h4 > 0.0 && ma200_h4 > 0.0)
                   && (h4Close > ma100_h4 && h4Close > ma200_h4);
   bool bearish1 = (ma100_h4 > 0.0 && ma200_h4 > 0.0)
                   && (h4Close < ma100_h4 && h4Close < ma200_h4);

   // --- Condition 2: D1 price vs MA50_D1 ---
   double d1Close = iClose(symbol, PERIOD_D1, 1);
   double ma50_d1 = GetMAValue(handles.MA50_D1, 1);

   bool bullish2 = (ma50_d1 > 0.0) && (d1Close > ma50_d1);
   bool bearish2 = (ma50_d1 > 0.0) && (d1Close < ma50_d1);

   int bullishCount = (bullish1 ? 1 : 0) + (bullish2 ? 1 : 0);
   int bearishCount = (bearish1 ? 1 : 0) + (bearish2 ? 1 : 0);

   // Conflicting signals — no usable bias
   if(bullishCount > 0 && bearishCount > 0)
   {
      Print("[Tier2] FAIL: Conflicting bias (bullish=", bullishCount,
            " bearish=", bearishCount, ")");
      return 0;
   }

   if(bullishCount >= 1)
   {
      Print("[Tier2] PASS: BULLISH (conditions=", bullishCount, ")");
      return 1;
   }
   if(bearishCount >= 1)
   {
      Print("[Tier2] PASS: BEARISH (conditions=", bearishCount, ")");
      return -1;
   }

   Print("[Tier2] FAIL: No directional bias");
   return 0;
}

//+------------------------------------------------------------------+
//| CheckTier3Signals                                                |
//| Evaluates 4 entry signals in the direction of bias.             |
//| Signals 2, 3, 4 are evaluated first so Signal 1 can use their   |
//| interim score to lower the confirmation bar if 2+ have fired.   |
//| Returns a SignalResult with score, flags, and reason string.    |
//+------------------------------------------------------------------+
SignalResult CheckTier3Signals(string symbol, IndicatorHandles &handles, int bias)
{
   SignalResult result;
   result.direction     = bias;
   result.tier3Score    = 0;
   result.zoneBonus     = false;
   result.flexibleEntry = false;
   result.reason        = "";

   int    score     = 0;
   string reasonBuf = "";

   bool isBuy = (bias == 1);

   // ----------------------------------------------------------------
   // Signal 2 — BB Middle
   // Buy:  last closed M1 candle closed above the BB middle (SMA) line
   // Sell: last closed M1 candle closed below the BB middle line
   // ----------------------------------------------------------------
   {
      double bbUpper, bbMiddle, bbLower;
      if(GetBBValues(handles.BB_M1, 1, bbUpper, bbMiddle, bbLower))
      {
         double closeM1_1 = iClose(symbol, PERIOD_M1, 1);
         bool s2 = isBuy ? (closeM1_1 > bbMiddle)
                         : (closeM1_1 < bbMiddle);
         if(s2)
         {
            score++;
            reasonBuf += "S2:BBMid ";
         }
      }
   }

   // ----------------------------------------------------------------
   // Signal 3 — BB Outer Rejection
   // Buy:  candle at shift 2 wick touched/broke BB lower; shift 1 closed back inside
   // Sell: candle at shift 2 wick touched/broke BB upper; shift 1 closed back inside
   // ----------------------------------------------------------------
   {
      double u2, m2, l2, u1, m1, l1;
      bool bbOk2 = GetBBValues(handles.BB_M1, 2, u2, m2, l2);
      bool bbOk1 = GetBBValues(handles.BB_M1, 1, u1, m1, l1);

      if(bbOk2 && bbOk1)
      {
         double low2   = iLow  (symbol, PERIOD_M1, 2);
         double high2  = iHigh (symbol, PERIOD_M1, 2);
         double close1 = iClose(symbol, PERIOD_M1, 1);

         bool s3 = isBuy ? ((low2 <= l2) && (close1 > l1))
                         : ((high2 >= u2) && (close1 < u1));
         if(s3)
         {
            score++;
            reasonBuf += "S3:BBReject ";
         }
      }
   }

   // ----------------------------------------------------------------
   // Signal 4 — MA5/MA9 Crossover + MA100 trend filter on M1
   // Buy:  MA5[1] > MA9[1], MA5[2] <= MA9[2], close > MA100
   // Sell: MA5[1] < MA9[1], MA5[2] >= MA9[2], close < MA100
   // ----------------------------------------------------------------
   {
      double ma5_1   = GetMAValue(handles.MA5_M1,   1);
      double ma9_1   = GetMAValue(handles.MA9_M1,   1);
      double ma5_2   = GetMAValue(handles.MA5_M1,   2);
      double ma9_2   = GetMAValue(handles.MA9_M1,   2);
      double ma100   = GetMAValue(handles.MA100_M1, 1);
      double closeM1 = iClose(symbol, PERIOD_M1, 1);

      if(ma5_1 > 0.0 && ma9_1 > 0.0 && ma5_2 > 0.0 && ma9_2 > 0.0 && ma100 > 0.0)
      {
         bool s4 = isBuy ? ((ma5_1 > ma9_1) && (ma5_2 <= ma9_2) && (closeM1 > ma100))
                         : ((ma5_1 < ma9_1) && (ma5_2 >= ma9_2) && (closeM1 < ma100));
         if(s4)
         {
            score++;
            reasonBuf += "S4:MACross ";
         }
      }
   }

   // ----------------------------------------------------------------
   // Signal 1 — Candlestick Pattern + Confirmation Candles
   // Evaluated last so interimScore from Signals 2–4 can relax the
   // confirmation requirement (interimFlexible = score >= 2 here).
   // ----------------------------------------------------------------
   {
      bool interimFlexible = (score >= 2);

      bool   patternFound = false;
      string patternName  = "";

      if(isBuy)
      {
         if(IsBullishEngulfing(symbol, PERIOD_M1, 1))
            { patternFound = true; patternName = "Engulf"; }
         else if(IsBullishPinBar(symbol, PERIOD_M1, 1))
            { patternFound = true; patternName = "PinBar"; }

         if(patternFound)
         {
            int confCount = CountConfirmationCandles(symbol, PERIOD_M1, 1, true);
            if(confCount >= 2 || interimFlexible)
            {
               score++;
               reasonBuf += "S1:" + patternName +
                            "(conf=" + IntegerToString(confCount) + ") ";
            }
         }
      }
      else
      {
         if(IsBearishEngulfing(symbol, PERIOD_M1, 1))
            { patternFound = true; patternName = "Engulf"; }
         else if(IsBearishPinBar(symbol, PERIOD_M1, 1))
            { patternFound = true; patternName = "PinBar"; }

         if(patternFound)
         {
            int confCount = CountConfirmationCandles(symbol, PERIOD_M1, 1, false);
            if(confCount >= 2 || interimFlexible)
            {
               score++;
               reasonBuf += "S1:" + patternName +
                            "(conf=" + IntegerToString(confCount) + ") ";
            }
         }
      }
   }

   result.tier3Score    = score;
   result.flexibleEntry = (score >= 3);
   result.reason        = (StringLen(reasonBuf) > 0)
                          ? StringSubstr(reasonBuf, 0, StringLen(reasonBuf) - 1)
                          : "none";
   return result;
}

//+------------------------------------------------------------------+
//| EvaluateEntry                                                    |
//| Orchestrates Tier 1 → Tier 2 → Tier 3 evaluation.              |
//| Returns an empty SignalResult (direction=0) on any failure.     |
//| Logs every evaluation outcome to the Experts tab.               |
//+------------------------------------------------------------------+
SignalResult EvaluateEntry(string           symbol,
                           IndicatorHandles &handles,
                           AssetProfile     &profile,
                           bool             masterSwitch,
                           int              openTradeCount,
                           int              maxOpenTrades,
                           bool             newsActive,
                           double           dailyDrawdownPct,
                           double           dailyDrawdownLimit)
{
   SignalResult empty;
   empty.direction     = 0;
   empty.tier3Score    = 0;
   empty.zoneBonus     = false;
   empty.flexibleEntry = false;
   empty.reason        = "";

   // Tier 1 — Hard gates
   if(!CheckTier1Gates(symbol, profile, (int)profile.spreadLimit,
                       masterSwitch, openTradeCount, maxOpenTrades,
                       newsActive, dailyDrawdownPct, dailyDrawdownLimit))
      return empty;

   // Tier 2 — Directional bias
   int bias = CheckTier2Bias(symbol, handles);
   if(bias == 0)
   {
      Print("[Entry] FAIL: Tier2 produced no clear bias");
      return empty;
   }

   // Tier 3 — Entry signals
   SignalResult result = CheckTier3Signals(symbol, handles, bias);

   // Require score >= 2, OR flexibleEntry (score >= 3 means any 1 signal suffices)
   if(result.tier3Score < 2 && !result.flexibleEntry)
   {
      Print("[Entry] FAIL: Tier3 score=", result.tier3Score, " | ", result.reason);
      return empty;
   }

   result.direction = bias;
   Print("[Entry] PASS | dir=", (bias == 1 ? "BUY" : "SELL"),
         " score=", result.tier3Score,
         " flex=", (result.flexibleEntry ? "Y" : "N"),
         " | ", result.reason);
   return result;
}

//+------------------------------------------------------------------+
#endif // SIGNALS_MQH
