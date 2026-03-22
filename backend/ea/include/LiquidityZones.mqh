//+------------------------------------------------------------------+
//|                                              LiquidityZones.mqh |
//|  Supply and demand zone detection for TradingBot EA.            |
//|  Zones are built from swing highs/lows with ATR-based width.   |
//+------------------------------------------------------------------+
#ifndef LIQUIDITYZONES_MQH
#define LIQUIDITYZONES_MQH

//+------------------------------------------------------------------+
//| LiquidityZone struct                                             |
//+------------------------------------------------------------------+
struct LiquidityZone
{
   double   priceHigh;   // upper boundary of the zone
   double   priceLow;    // lower boundary of the zone
   int      type;        // 1 = demand (buy zone), -1 = supply (sell zone)
   int      strength;    // number of times price has respected this zone (starts at 1)
   datetime firstSeen;   // time of the bar that created the zone
   bool     isActive;    // false once price has closed fully through the zone
};

// Global zone array — populated by BuildLiquidityZones(), queried by IsNearZone()
LiquidityZone detectedZones[];

//+------------------------------------------------------------------+
//| DetectSwingPoints                                                |
//| Scans price history for swing highs and swing lows using a      |
//| 2-bar confirmation on each side.                                 |
//+------------------------------------------------------------------+
void DetectSwingPoints(string symbol, ENUM_TIMEFRAMES tf, int lookback,
                       int    &swingHighIdxs[],   double &swingHighPrices[],
                       int    &swingLowIdxs[],    double &swingLowPrices[])
{
   // Allocate lookback+3 so that loop from i=2 to i=lookback can
   // safely access highs[i+2] / lows[i+2] without an out-of-bounds read.
   double highs[];
   double lows[];
   int    bufSize = lookback + 3;

   if(CopyHigh(symbol, tf, 0, bufSize, highs) < bufSize) return;
   if(CopyLow (symbol, tf, 0, bufSize, lows)  < bufSize) return;

   // Clear output arrays
   ArrayResize(swingHighIdxs,    0);
   ArrayResize(swingHighPrices,  0);
   ArrayResize(swingLowIdxs,     0);
   ArrayResize(swingLowPrices,   0);

   for(int i = 2; i <= lookback; i++)
   {
      // Swing high: bar i is strictly the highest of the 5-bar window (i-2 .. i+2)
      if(highs[i] > highs[i-1] && highs[i] > highs[i+1] &&
         highs[i] > highs[i-2] && highs[i] > highs[i+2])
      {
         int n = ArraySize(swingHighIdxs);
         ArrayResize(swingHighIdxs,   n + 1);
         ArrayResize(swingHighPrices, n + 1);
         swingHighIdxs[n]   = i;
         swingHighPrices[n] = highs[i];
      }

      // Swing low: bar i is strictly the lowest of the 5-bar window
      if(lows[i] < lows[i-1] && lows[i] < lows[i+1] &&
         lows[i] < lows[i-2] && lows[i] < lows[i+2])
      {
         int n = ArraySize(swingLowIdxs);
         ArrayResize(swingLowIdxs,   n + 1);
         ArrayResize(swingLowPrices, n + 1);
         swingLowIdxs[n]   = i;
         swingLowPrices[n] = lows[i];
      }
   }
}

//+------------------------------------------------------------------+
//| BuildLiquidityZones                                              |
//| Reconstructs detectedZones[] from scratch using swing points on  |
//| the given timeframe.  Call on OnInit and every 4 hours.          |
//+------------------------------------------------------------------+
void BuildLiquidityZones(string symbol, ENUM_TIMEFRAMES tf, int lookback)
{
   // --- 1. ATR for zone width calculation ---
   int    atrHandle = iATR(symbol, tf, 14);
   double atrBuf[];
   int    atrSize   = lookback + 5;

   if(atrHandle == INVALID_HANDLE ||
      CopyBuffer(atrHandle, 0, 0, atrSize, atrBuf) < atrSize)
   {
      if(atrHandle != INVALID_HANDLE) IndicatorRelease(atrHandle);
      Print("[Zones] ATR buffer failed — skipping zone build for ", symbol);
      return;
   }
   IndicatorRelease(atrHandle);

   // --- 2. Detect swing points ---
   int    swingHighIdxs[];
   double swingHighPrices[];
   int    swingLowIdxs[];
   double swingLowPrices[];
   DetectSwingPoints(symbol, tf, lookback,
                     swingHighIdxs, swingHighPrices,
                     swingLowIdxs,  swingLowPrices);

   // --- 3. Clear existing zones ---
   ArrayResize(detectedZones, 0);

   // --- 4. Build demand zones from swing lows ---
   int numLows = ArraySize(swingLowIdxs);
   for(int i = 0; i < numLows; i++)
   {
      int    barIdx = swingLowIdxs[i];
      double atr    = atrBuf[barIdx];

      LiquidityZone zone;
      zone.priceLow  = swingLowPrices[i] - atr * 0.1;
      zone.priceHigh = swingLowPrices[i] + atr * 0.5;
      zone.type      = 1;
      zone.strength  = 1;
      zone.isActive  = true;
      zone.firstSeen = iTime(symbol, tf, barIdx);

      // Duplicate check — merge if 50 %+ overlap with an existing zone
      bool merged = false;
      int  nZones = ArraySize(detectedZones);
      for(int z = 0; z < nZones; z++)
      {
         if(detectedZones[z].type != zone.type) continue;

         double overlapLow   = MathMax(zone.priceLow,  detectedZones[z].priceLow);
         double overlapHigh  = MathMin(zone.priceHigh, detectedZones[z].priceHigh);
         double overlapRange = overlapHigh - overlapLow;
         double unionRange   = MathMax(zone.priceHigh, detectedZones[z].priceHigh)
                             - MathMin(zone.priceLow,  detectedZones[z].priceLow);

         if(overlapRange > 0 && unionRange > 0 && overlapRange / unionRange > 0.5)
         {
            detectedZones[z].strength++;
            merged = true;
            break;
         }
      }

      if(!merged)
      {
         ArrayResize(detectedZones, nZones + 1);
         detectedZones[nZones] = zone;
      }
   }

   // --- 5. Build supply zones from swing highs ---
   int numHighs = ArraySize(swingHighIdxs);
   for(int i = 0; i < numHighs; i++)
   {
      int    barIdx = swingHighIdxs[i];
      double atr    = atrBuf[barIdx];

      LiquidityZone zone;
      zone.priceLow  = swingHighPrices[i] - atr * 0.5;
      zone.priceHigh = swingHighPrices[i] + atr * 0.1;
      zone.type      = -1;
      zone.strength  = 1;
      zone.isActive  = true;
      zone.firstSeen = iTime(symbol, tf, barIdx);

      bool merged = false;
      int  nZones = ArraySize(detectedZones);
      for(int z = 0; z < nZones; z++)
      {
         if(detectedZones[z].type != zone.type) continue;

         double overlapLow   = MathMax(zone.priceLow,  detectedZones[z].priceLow);
         double overlapHigh  = MathMin(zone.priceHigh, detectedZones[z].priceHigh);
         double overlapRange = overlapHigh - overlapLow;
         double unionRange   = MathMax(zone.priceHigh, detectedZones[z].priceHigh)
                             - MathMin(zone.priceLow,  detectedZones[z].priceLow);

         if(overlapRange > 0 && unionRange > 0 && overlapRange / unionRange > 0.5)
         {
            detectedZones[z].strength++;
            merged = true;
            break;
         }
      }

      if(!merged)
      {
         int nZones2 = ArraySize(detectedZones);
         ArrayResize(detectedZones, nZones2 + 1);
         detectedZones[nZones2] = zone;
      }
   }

   // --- 6. Mark zones inactive if price has closed through them ---
   double closes[];
   if(CopyClose(symbol, tf, 0, 5, closes) == 5)
   {
      int total = ArraySize(detectedZones);
      for(int z = 0; z < total; z++)
      {
         if(!detectedZones[z].isActive) continue;

         for(int c = 0; c < 5; c++)
         {
            // Demand zone breached: a close below the zone's lower boundary
            if(detectedZones[z].type == 1 && closes[c] < detectedZones[z].priceLow)
            {
               detectedZones[z].isActive = false;
               break;
            }
            // Supply zone breached: a close above the zone's upper boundary
            if(detectedZones[z].type == -1 && closes[c] > detectedZones[z].priceHigh)
            {
               detectedZones[z].isActive = false;
               break;
            }
         }
      }
   }

   Print("[Zones] Built ", ArraySize(detectedZones), " zones for ", symbol);
}

//+------------------------------------------------------------------+
//| IsNearZone                                                       |
//| Returns true if currentPrice is within ATR*1.5 of an active     |
//| zone matching the trade direction.                               |
//| zoneStrength is set to the matching zone's strength value.       |
//+------------------------------------------------------------------+
bool IsNearZone(string symbol, int direction, double currentPrice, double &zoneStrength)
{
   zoneStrength = 0.0;

   // Use H1 ATR for proximity calculation regardless of build timeframe
   int    atrHandle = iATR(symbol, PERIOD_H1, 14);
   double atrBuf[];
   if(atrHandle == INVALID_HANDLE || CopyBuffer(atrHandle, 0, 0, 2, atrBuf) < 2)
   {
      if(atrHandle != INVALID_HANDLE) IndicatorRelease(atrHandle);
      return false;
   }
   IndicatorRelease(atrHandle);

   double atr       = atrBuf[1];   // bar 1 = the most recent closed bar
   double proximity = atr * 1.5;

   int total = ArraySize(detectedZones);
   for(int z = 0; z < total; z++)
   {
      if(!detectedZones[z].isActive)          continue;
      if(detectedZones[z].type != direction)  continue;

      if(currentPrice >= detectedZones[z].priceLow  - proximity &&
         currentPrice <= detectedZones[z].priceHigh + proximity)
      {
         zoneStrength = detectedZones[z].strength;
         return true;
      }
   }

   return false;
}

//+------------------------------------------------------------------+
#endif // LIQUIDITYZONES_MQH
