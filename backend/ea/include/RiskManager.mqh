//+------------------------------------------------------------------+
//|                                                 RiskManager.mqh |
//|  Position tracking, lot sizing, drawdown calculation,           |
//|  SL/TP calculation, and trade execution for TradingBot.mq5     |
//+------------------------------------------------------------------+
#ifndef RISKMANAGER_MQH
#define RISKMANAGER_MQH

#include <Trade\Trade.mqh>
#include "Signals.mqh"

// AssetProfiles.mqh and Signals.mqh are included before this file in
// TradingBot.mq5, so AssetProfile, IndicatorHandles, GetBBValues(), and
// GetMAValue() are all accessible here without a separate include.

//+------------------------------------------------------------------+
//| TradeRecord                                                      |
//| Tracks the live state of a single open position managed by this |
//| EA, including dynamic fields (worstPrice, isLocked, hedgeTicket)|
//| that MT5 does not store natively.                               |
//+------------------------------------------------------------------+
struct TradeRecord
{
   ulong    ticket;       // MT5 position ticket (unique identifier)
   int      direction;    // 1 = BUY, -1 = SELL
   double   entryPrice;   // price at which the position was opened
   double   lotSize;      // position volume in lots
   double   stopLoss;     // current SL price (may differ from MT5 after modifications)
   double   takeProfit;   // current TP price
   double   worstPrice;   // most adverse price since open:
                          //   BUY  → lowest bid reached
                          //   SELL → highest ask reached
   bool     isLocked;     // true once the breakeven/lock mechanism has triggered
   ulong    hedgeTicket;  // ticket of the counter-hedge position; 0 if none open
   datetime openTime;     // server time when the position was opened
   string   symbol;       // chart symbol for this position
};

//+------------------------------------------------------------------+
//| GLOBAL ARRAY — all currently open positions tracked by the EA   |
//+------------------------------------------------------------------+
TradeRecord openTrades[];

//+------------------------------------------------------------------+
//| HELPER: returns true if `ticket` exists in `openTrades[]`       |
//+------------------------------------------------------------------+
bool TradeRecordExists(ulong ticket)
{
   int n = ArraySize(openTrades);
   for(int i = 0; i < n; i++)
      if(openTrades[i].ticket == ticket) return true;
   return false;
}

//+------------------------------------------------------------------+
//| SyncOpenTrades                                                   |
//| Keeps openTrades[] in sync with MT5's live positions.           |
//|                                                                  |
//| Steps:                                                           |
//|  1. Collect all live position tickets from MT5.                 |
//|  2. Remove records whose tickets are no longer live.            |
//|  3. Add new records for tickets not yet tracked.                |
//|  4. Update worstPrice for every existing record.                |
//+------------------------------------------------------------------+
void SyncOpenTrades()
{
   int liveCount = PositionsTotal();

   // --- Step 1: collect live tickets ---
   ulong liveTickets[];
   ArrayResize(liveTickets, liveCount);
   for(int i = 0; i < liveCount; i++)
      liveTickets[i] = PositionGetTicket(i);

   // --- Step 2: remove stale records (iterate backwards to allow safe deletion) ---
   for(int i = ArraySize(openTrades) - 1; i >= 0; i--)
   {
      bool found = false;
      for(int j = 0; j < liveCount; j++)
         if(liveTickets[j] == openTrades[i].ticket) { found = true; break; }

      if(!found)
      {
         Print("[RiskMgr] Position closed/removed: ticket=", openTrades[i].ticket);
         // Shift elements down to fill the gap
         int total = ArraySize(openTrades);
         for(int k = i; k < total - 1; k++)
            openTrades[k] = openTrades[k + 1];
         ArrayResize(openTrades, total - 1);
      }
   }

   // --- Step 3: add new positions not yet in openTrades[] ---
   for(int i = 0; i < liveCount; i++)
   {
      ulong ticket = liveTickets[i];
      if(TradeRecordExists(ticket)) continue;  // already tracked

      if(!PositionSelectByTicket(ticket)) continue;  // selection failed

      string sym = PositionGetString(POSITION_SYMBOL);
      int    dir = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? 1 : -1;

      TradeRecord rec;
      rec.ticket      = ticket;
      rec.direction   = dir;
      rec.entryPrice  = PositionGetDouble(POSITION_PRICE_OPEN);
      rec.lotSize     = PositionGetDouble(POSITION_VOLUME);
      rec.stopLoss    = PositionGetDouble(POSITION_SL);
      rec.takeProfit  = PositionGetDouble(POSITION_TP);
      rec.worstPrice  = (dir == 1)
                        ? SymbolInfoDouble(sym, SYMBOL_BID)
                        : SymbolInfoDouble(sym, SYMBOL_ASK);
      rec.isLocked    = false;
      rec.hedgeTicket = 0;
      rec.openTime    = (datetime)PositionGetInteger(POSITION_TIME);
      rec.symbol      = sym;

      int n = ArraySize(openTrades);
      ArrayResize(openTrades, n + 1);
      openTrades[n] = rec;

      Print("[RiskMgr] New position tracked: ticket=", ticket,
            " sym=", sym, " dir=", (dir == 1 ? "BUY" : "SELL"),
            " lot=", rec.lotSize);
   }

   // --- Step 4: update worstPrice for all tracked records ---
   int total = ArraySize(openTrades);
   for(int i = 0; i < total; i++)
   {
      if(openTrades[i].direction == 1)
      {
         double bid = SymbolInfoDouble(openTrades[i].symbol, SYMBOL_BID);
         if(bid < openTrades[i].worstPrice)
            openTrades[i].worstPrice = bid;
      }
      else
      {
         double ask = SymbolInfoDouble(openTrades[i].symbol, SYMBOL_ASK);
         if(ask > openTrades[i].worstPrice)
            openTrades[i].worstPrice = ask;
      }
   }
}

//+------------------------------------------------------------------+
//| CalculateLotSize                                                 |
//| Scales baseLot by the asset's lotMultiplier, then normalises     |
//| to the broker's volume step and clamps to min/max limits.       |
//+------------------------------------------------------------------+
double CalculateLotSize(string symbol, double baseLot, AssetProfile &profile)
{
   double raw  = baseLot * profile.lotMultiplier;
   double step = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);

   // Normalise to nearest valid step increment
   double normalized = (step > 0.0) ? MathRound(raw / step) * step : raw;

   // Clamp to broker limits
   double minLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
   double maxLot = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
   normalized = MathMax(minLot, MathMin(maxLot, normalized));

   return normalized;
}

//+------------------------------------------------------------------+
//| GetDailyDrawdownPct                                              |
//| Calculates how far equity has dropped below today's starting     |
//| balance as a percentage.                                         |
//|                                                                  |
//| Method: sum all closed-trade P&L from today via HistoryDeals to |
//| reconstruct the balance at day start, then compare to current   |
//| equity.                                                         |
//+------------------------------------------------------------------+
double GetDailyDrawdownPct()
{
   // Midnight of the current trading day on the server clock
   datetime todayMidnight = StringToTime(TimeToString(TimeCurrent(), TIME_DATE));

   HistorySelect(todayMidnight, TimeCurrent());

   double totalPnL = 0.0;
   int    dealCount = HistoryDealsTotal();

   for(int i = 0; i < dealCount; i++)
   {
      ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket == 0) continue;

      // Only count deals that closed a trade (OUT), not opening entries or balance ops
      long dealEntry = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
      if(dealEntry != DEAL_ENTRY_OUT) continue;

      totalPnL += HistoryDealGetDouble(dealTicket, DEAL_PROFIT)
               +  HistoryDealGetDouble(dealTicket, DEAL_COMMISSION)
               +  HistoryDealGetDouble(dealTicket, DEAL_SWAP);
   }

   double currentBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   double startBalance   = currentBalance - totalPnL;

   // Fallback: no closed deals today → no realised drawdown from closed trades
   if(startBalance <= 0.0)
      startBalance = currentBalance;

   double currentEquity = AccountInfoDouble(ACCOUNT_EQUITY);
   double drawdown      = ((startBalance - currentEquity) / startBalance) * 100.0;

   return MathMax(0.0, drawdown);  // negative values mean equity > start → 0% drawdown
}

//+------------------------------------------------------------------+
//| CountOpenTrades                                                  |
//| Counts open positions for the given symbol.                     |
//| Pass an empty string "" to count positions across all symbols.  |
//+------------------------------------------------------------------+
int CountOpenTrades(string symbol)
{
   int count = 0;
   int total = PositionsTotal();
   for(int i = 0; i < total; i++)
   {
      if(symbol == "" || PositionGetSymbol(i) == symbol)
         count++;
   }
   return count;
}

//+------------------------------------------------------------------+
//| OpenTrade                                                        |
//| Sends a market order using CTrade and returns the position      |
//| ticket on success, 0 on failure.                                |
//+------------------------------------------------------------------+
ulong OpenTrade(string symbol, int direction, double lotSize,
                double stopLoss, double takeProfit, string comment)
{
   CTrade trade;
   trade.SetDeviationInPoints(3);  // allow 0.3 pip slippage

   bool ok = (direction == 1)
      ? trade.Buy (lotSize, symbol, 0, stopLoss, takeProfit, comment)
      : trade.Sell(lotSize, symbol, 0, stopLoss, takeProfit, comment);

   if(!ok || trade.ResultRetcode() != TRADE_RETCODE_DONE)
   {
      Print("[RiskMgr] OpenTrade FAILED | dir=", (direction == 1 ? "BUY" : "SELL"),
            " lot=", lotSize, " sl=", stopLoss, " tp=", takeProfit,
            " retcode=", trade.ResultRetcode(),
            " comment=", trade.ResultComment());
      return 0;
   }

   ulong ticket = trade.ResultOrder();
   Print("[RiskMgr] OpenTrade SUCCESS | ticket=", ticket,
         " dir=", (direction == 1 ? "BUY" : "SELL"),
         " lot=", lotSize, " sl=", stopLoss, " tp=", takeProfit);
   return ticket;
}

//+------------------------------------------------------------------+
//| CalculateStopLoss                                                |
//| Sets SL just beyond the opposite BB band with a 2-pip buffer.   |
//| Buy:  SL = BB lower band - 2 pips                               |
//| Sell: SL = BB upper band + 2 pips                               |
//+------------------------------------------------------------------+
double CalculateStopLoss(string symbol, int direction, IndicatorHandles &handles)
{
   double upper, middle, lower;
   if(!GetBBValues(handles.BB_M1, 1, upper, middle, lower))
   {
      Print("[RiskMgr] CalculateStopLoss: GetBBValues failed — returning 0");
      return 0.0;
   }

   // 2 pips buffer: on a 5-digit broker 1 pip = 10 points, so 2 pips = 20 points
   double buffer = SymbolInfoDouble(symbol, SYMBOL_POINT) * 20.0;

   return (direction == 1) ? (lower - buffer)
                           : (upper + buffer);
}

//+------------------------------------------------------------------+
//| CalculateTakeProfit                                              |
//| Initial TP at the opposite BB band.                             |
//| Buy:  TP = BB upper band                                         |
//| Sell: TP = BB lower band                                         |
//| NOTE: Prompt 5 will override this with dynamic close conditions. |
//+------------------------------------------------------------------+
double CalculateTakeProfit(string symbol, int direction, IndicatorHandles &handles)
{
   double upper, middle, lower;
   if(!GetBBValues(handles.BB_M1, 1, upper, middle, lower))
   {
      Print("[RiskMgr] CalculateTakeProfit: GetBBValues failed — returning 0");
      return 0.0;
   }

   return (direction == 1) ? upper : lower;
}

//+------------------------------------------------------------------+
//| CalculateFibLevel                                                |
//| Returns a Fibonacci retracement price from worstPrice toward    |
//| entryPrice at the given ratio.                                  |
//|   fibRatio 0.618 → 61.8% retracement (unlock trigger)          |
//|   fibRatio 0.786 → 78.6% retracement (hedge SL reference)      |
//+------------------------------------------------------------------+
double CalculateFibLevel(double entryPrice, double worstPrice,
                         int direction, double fibRatio)
{
   if(direction == 1)
      // BUY: worstPrice is the low, entryPrice is the high reference
      return worstPrice + (entryPrice - worstPrice) * fibRatio;
   else
      // SELL: worstPrice is the high, entryPrice is the low reference
      return worstPrice - (worstPrice - entryPrice) * fibRatio;
}

//+------------------------------------------------------------------+
//| GetPipDistance                                                   |
//| Returns the absolute distance between two prices in pips.       |
//| Accounts for 5-digit forex (10 points per pip) and 3-digit JPY. |
//+------------------------------------------------------------------+
double GetPipDistance(string symbol, double price1, double price2)
{
   int    digits  = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   double point   = SymbolInfoDouble(symbol, SYMBOL_POINT);
   double pipSize;

   // 5-digit forex or 3-digit JPY: 1 pip = 10 points
   if(digits == 5 || digits == 3)
      pipSize = point * 10.0;
   else
      // 4-digit forex or 2-digit JPY: 1 pip = 1 point
      pipSize = point;

   return (pipSize > 0.0) ? MathAbs(price1 - price2) / pipSize : 0.0;
}

//+------------------------------------------------------------------+
//| CheckLockCondition                                               |
//| Returns true when the trade has moved far enough against us to  |
//| warrant opening a hedge, and has not already been locked.       |
//+------------------------------------------------------------------+
bool CheckLockCondition(TradeRecord &trade, string symbol, int lockThresholdPips)
{
   double pipDist = GetPipDistance(symbol, trade.entryPrice, trade.worstPrice);
   return (pipDist >= (double)lockThresholdPips)
          && !trade.isLocked
          && (trade.hedgeTicket == 0);
}

//+------------------------------------------------------------------+
//| OpenHedgeTrade                                                   |
//| Opens a counter-trade to neutralise further drawdown on a       |
//| locked position.                                                |
//|                                                                  |
//| Hedge TP:  61.8% fib retracement back toward entry — the hedge  |
//|            closes in profit when price partially recovers.      |
//| Hedge SL:  78.6% fib level BEYOND worstPrice — a safety net    |
//|            if the hedge itself moves adversely.                 |
//+------------------------------------------------------------------+
void OpenHedgeTrade(TradeRecord &trade, string symbol, double lotSize)
{
   int hedgeDir = -trade.direction;  // opposite direction

   // Hedge TP: price comes back 61.8% of the way from worst toward entry
   double hedgeTP = CalculateFibLevel(trade.entryPrice, trade.worstPrice,
                                      trade.direction, 0.618);

   // Hedge SL: 78.6% of the adverse move projected BEYOND worstPrice
   double hedgeSL;
   if(trade.direction == 1)
      // Buy trade → hedge is sell → SL is below worstPrice
      hedgeSL = trade.worstPrice - (trade.entryPrice - trade.worstPrice) * 0.786;
   else
      // Sell trade → hedge is buy → SL is above worstPrice
      hedgeSL = trade.worstPrice + (trade.worstPrice - trade.entryPrice) * 0.786;

   ulong ticket = OpenTrade(symbol, hedgeDir, lotSize, hedgeSL, hedgeTP,
                            "TradingBot-Hedge");
   if(ticket > 0)
   {
      trade.hedgeTicket = ticket;
      trade.isLocked    = true;
      Print("[RiskMgr] LOCK TRIGGERED — hedge opened for ticket ", trade.ticket,
            " | hedge ticket=", ticket,
            " | hedgeTP=", hedgeTP, " hedgeSL=", hedgeSL);
   }
   else
   {
      Print("[RiskMgr] LOCK FAILED — could not open hedge for ticket ", trade.ticket);
   }
}

//+------------------------------------------------------------------+
//| CheckUnlockCondition                                             |
//| Returns true when price has retraced to the 61.8% fib level,   |
//| indicating the hedge can be closed and the lock reset.          |
//+------------------------------------------------------------------+
bool CheckUnlockCondition(TradeRecord &trade, string symbol)
{
   if(!trade.isLocked || trade.hedgeTicket == 0)
      return false;

   double fib61 = CalculateFibLevel(trade.entryPrice, trade.worstPrice,
                                    trade.direction, 0.618);

   if(trade.direction == 1)
      // Buy: unlock when bid price climbs back to the 61.8% level
      return (SymbolInfoDouble(symbol, SYMBOL_BID) >= fib61);
   else
      // Sell: unlock when ask price drops back to the 61.8% level
      return (SymbolInfoDouble(symbol, SYMBOL_ASK) <= fib61);
}

//+------------------------------------------------------------------+
//| UnlockTrade                                                      |
//| Closes the hedge position and resets the lock state so the      |
//| original trade can continue trading freely.                     |
//+------------------------------------------------------------------+
void UnlockTrade(TradeRecord &trade, string symbol)
{
   CTrade closer;
   closer.PositionClose(trade.hedgeTicket);

   Print("[RiskMgr] UNLOCK — hedge closed, original trade resumed | ticket=",
         trade.ticket, " hedgeTicket=", trade.hedgeTicket);

   trade.isLocked    = false;
   trade.hedgeTicket = 0;
   // Reset worstPrice to entry so lock distance starts counting from zero again
   trade.worstPrice  = trade.entryPrice;
}

//+------------------------------------------------------------------+
//| CheckExitConditions                                              |
//| Checks two close triggers for an open trade:                    |
//|  1. Hard TP: candle closed at or beyond the far BB band         |
//|  2. Soft exit: closed past BB middle AND at least 1 MA confirms |
//| Returns true if the trade was closed, false if still open.      |
//+------------------------------------------------------------------+
bool CheckExitConditions(TradeRecord &trade, string symbol,
                         IndicatorHandles &handles)
{
   double upper, middle, lower;
   if(!GetBBValues(handles.BB_M1, 1, upper, middle, lower))
      return false;

   double closeM1_1 = iClose(symbol, PERIOD_M1, 1);
   CTrade closer;

   // --- Hard TP: price hit or crossed the far BB band ---
   if(trade.direction == 1 && closeM1_1 >= upper)
   {
      closer.PositionClose(trade.ticket);
      Print("[RiskMgr] EXIT (hard TP) — BUY closed at BB upper | ticket=", trade.ticket,
            " close=", closeM1_1, " upper=", upper);
      return true;
   }
   if(trade.direction == -1 && closeM1_1 <= lower)
   {
      closer.PositionClose(trade.ticket);
      Print("[RiskMgr] EXIT (hard TP) — SELL closed at BB lower | ticket=", trade.ticket,
            " close=", closeM1_1, " lower=", lower);
      return true;
   }

   // --- Soft exit: closed past BB middle AND at least 1 MA confirms direction ---
   double ma50  = GetMAValue(handles.MA50_M1,  1);
   double ma65  = GetMAValue(handles.MA65_M1,  1);
   double ma100 = GetMAValue(handles.MA100_M1, 1);

   if(trade.direction == 1)
   {
      // Buy soft exit: closed above middle AND at least 1 MA is below current price
      bool aboveMiddle = (closeM1_1 > middle);
      bool maConfirm   = ((ma50  > 0.0 && closeM1_1 > ma50)  ||
                          (ma65  > 0.0 && closeM1_1 > ma65)  ||
                          (ma100 > 0.0 && closeM1_1 > ma100));
      if(aboveMiddle && maConfirm)
      {
         closer.PositionClose(trade.ticket);
         Print("[RiskMgr] EXIT (soft) — BUY closed at BB middle | ticket=", trade.ticket);
         return true;
      }
   }
   else
   {
      // Sell soft exit: closed below middle AND at least 1 MA is above current price
      bool belowMiddle = (closeM1_1 < middle);
      bool maConfirm   = ((ma50  > 0.0 && closeM1_1 < ma50)  ||
                          (ma65  > 0.0 && closeM1_1 < ma65)  ||
                          (ma100 > 0.0 && closeM1_1 < ma100));
      if(belowMiddle && maConfirm)
      {
         closer.PositionClose(trade.ticket);
         Print("[RiskMgr] EXIT (soft) — SELL closed at BB middle | ticket=", trade.ticket);
         return true;
      }
   }

   return false;  // no exit condition met
}

//+------------------------------------------------------------------+
//| HELPER: IsHedgeTrade                                            |
//| Returns true if `ticket` is the hedge of any tracked position.  |
//+------------------------------------------------------------------+
bool IsHedgeTrade(ulong ticket)
{
   int n = ArraySize(openTrades);
   for(int j = 0; j < n; j++)
      if(openTrades[j].hedgeTicket == ticket) return true;
   return false;
}

//+------------------------------------------------------------------+
//| ManageAllTrades                                                  |
//| Called every tick. Iterates all tracked positions and applies:  |
//|   1. Exit conditions (BB hard TP or soft exit)                  |
//|   2. Lock trigger (open hedge if threshold exceeded)            |
//|   3. Unlock trigger (close hedge when price retraces 61.8%)     |
//| Hedge trades are skipped — they are managed via their parent.   |
//+------------------------------------------------------------------+
void ManageAllTrades(string symbol, IndicatorHandles &handles,
                     AssetProfile &profile, int lockThresholdPips)
{
   // Iterate backwards so in-loop removal by index is safe
   for(int i = ArraySize(openTrades) - 1; i >= 0; i--)
   {
      // Skip hedge positions — managed indirectly through their parent record
      if(IsHedgeTrade(openTrades[i].ticket)) continue;

      // --- 1. Exit check ---
      if(CheckExitConditions(openTrades[i], symbol, handles))
      {
         // Remove from array: shift elements down then resize
         int total = ArraySize(openTrades);
         for(int k = i; k < total - 1; k++)
            openTrades[k] = openTrades[k + 1];
         ArrayResize(openTrades, total - 1);
         continue;
      }

      // --- 2. Lock trigger ---
      if(CheckLockCondition(openTrades[i], symbol, lockThresholdPips))
         OpenHedgeTrade(openTrades[i], symbol, openTrades[i].lotSize);

      // --- 3. Unlock trigger ---
      if(CheckUnlockCondition(openTrades[i], symbol))
         UnlockTrade(openTrades[i], symbol);
   }
}

//+------------------------------------------------------------------+
#endif // RISKMANAGER_MQH
