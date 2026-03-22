//+------------------------------------------------------------------+
//|                                               AssetProfiles.mqh |
//|  Per-symbol trading configuration profiles.                     |
//|  Used by TradingBot.mq5 to adapt behaviour across asset classes.|
//+------------------------------------------------------------------+
#ifndef ASSETPROFILES_MQH
#define ASSETPROFILES_MQH

//+------------------------------------------------------------------+
//| AssetProfile struct                                              |
//| Holds all per-symbol configuration values.                      |
//+------------------------------------------------------------------+
struct AssetProfile
{
   string symbol;          // Symbol name as it appears in MT5 Market Watch
   double pipMultiplier;   // Points-per-pip multiplier (10 for 5-digit forex, 1 for synthetics/crypto)
   double spreadLimit;     // Maximum allowed spread in points before skipping entry
   double lotMultiplier;   // Scale factor applied to base LotSize for this asset
   bool   useSessionFilter; // Whether to restrict trading to specific market sessions
   bool   useNewsFilter;   // Whether to pause trading around high-impact news events
};

//+------------------------------------------------------------------+
//| GetAssetProfile                                                  |
//| Returns the AssetProfile for the given symbol.                  |
//| Falls back to a conservative default for unrecognised symbols.  |
//+------------------------------------------------------------------+
AssetProfile GetAssetProfile(string symbol)
{
   AssetProfile p;
   p.symbol = symbol;

   // ----------------------------------------------------------------
   // EURUSD — Major forex pair, tight spreads, full filters active
   // ----------------------------------------------------------------
   if(symbol == "EURUSD")
   {
      p.pipMultiplier  = 10.0;   // 5-digit broker: 1 pip = 10 points
      p.spreadLimit    = 2.0;    // Skip entry if spread exceeds 2 points
      p.lotMultiplier  = 1.0;
      p.useSessionFilter = true; // Only trade London/NY session overlap
      p.useNewsFilter    = true;
   }
   // ----------------------------------------------------------------
   // GBPUSD — Major forex pair, slightly wider spread tolerance
   // ----------------------------------------------------------------
   else if(symbol == "GBPUSD")
   {
      p.pipMultiplier  = 10.0;
      p.spreadLimit    = 3.0;    // GBP pairs can widen; allow up to 3 points
      p.lotMultiplier  = 1.0;
      p.useSessionFilter = true;
      p.useNewsFilter    = true;
   }
   // ----------------------------------------------------------------
   // XAUUSD (Gold) — Commodity, wider natural spread, session filtered
   // ----------------------------------------------------------------
   else if(symbol == "XAUUSD")
   {
      p.pipMultiplier  = 10.0;   // Gold also uses 2-decimal pricing on most brokers
      p.spreadLimit    = 50.0;   // Gold spreads can reach 30–50 points legitimately
      p.lotMultiplier  = 0.5;    // Reduce size due to high per-pip value
      p.useSessionFilter = true; // Best liquidity during London/NY overlap
      p.useNewsFilter    = true; // Highly sensitive to USD news events
   }
   // ----------------------------------------------------------------
   // BTCUSD — Cryptocurrency, volatile, 24/7, very wide spreads possible
   // ----------------------------------------------------------------
   else if(symbol == "BTCUSD")
   {
      p.pipMultiplier  = 1.0;    // 2-decimal pricing; 1 point = 1 pip for crypto
      p.spreadLimit    = 50000.0; // Crypto spreads measured in points; allow very wide
      p.lotMultiplier  = 0.1;    // Very small multiplier — high nominal value per lot
      p.useSessionFilter = false; // Crypto trades 24/7, no meaningful session filter
      p.useNewsFilter    = false; // Crypto is not correlated to traditional news calendar
   }
   // ----------------------------------------------------------------
   // Volatility 75 Index — Deriv synthetic, constant volatility, 24/7
   // ----------------------------------------------------------------
   else if(symbol == "Volatility 75 Index")
   {
      p.pipMultiplier  = 1.0;    // Synthetic index: 1 point = 1 pip
      p.spreadLimit    = 50000.0; // Synthetics have very wide spreads measured in points
      p.lotMultiplier  = 0.5;
      p.useSessionFilter = false; // Synthetics run 24/7 without real-world sessions
      p.useNewsFilter    = false; // Not affected by real-world news events
   }
   // ----------------------------------------------------------------
   // Boom 1000 Index — Deriv synthetic with upward spike every ~1000 ticks
   // ----------------------------------------------------------------
   else if(symbol == "Boom 1000 Index")
   {
      p.pipMultiplier  = 1.0;
      p.spreadLimit    = 50000.0; // Boom/Crash spreads measured in points; very wide
      p.lotMultiplier  = 0.5;
      p.useSessionFilter = false;
      p.useNewsFilter    = false;
   }
   // ----------------------------------------------------------------
   // Crash 1000 Index — Deriv synthetic with downward spike every ~1000 ticks
   // ----------------------------------------------------------------
   else if(symbol == "Crash 1000 Index")
   {
      p.pipMultiplier  = 1.0;
      p.spreadLimit    = 50000.0; // Boom/Crash spreads measured in points; very wide
      p.lotMultiplier  = 0.5;
      p.useSessionFilter = false;
      p.useNewsFilter    = false;
   }
   // ----------------------------------------------------------------
   // DEFAULT — Safe conservative values for any unrecognised symbol
   // ----------------------------------------------------------------
   else
   {
      p.pipMultiplier  = 10.0;  // Assume 5-digit forex as the safest default
      p.spreadLimit    = 5.0;   // Conservative spread cap
      p.lotMultiplier  = 1.0;
      p.useSessionFilter = true;
      p.useNewsFilter    = true;
   }

   return p;
}

//+------------------------------------------------------------------+
#endif // ASSETPROFILES_MQH
