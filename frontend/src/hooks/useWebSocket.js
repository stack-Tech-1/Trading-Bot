import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Custom hook that manages a WebSocket connection with automatic reconnection.
 *
 * @param {string} url  WebSocket URL to connect to (e.g. "ws://localhost:8765")
 * @returns {{ tradeData, isConnected, lastUpdate, error, sendMessage, reconnect, signalLog }}
 */
export default function useWebSocket(url) {
  const [tradeData,   setTradeData]   = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate,  setLastUpdate]  = useState(null)
  const [error,       setError]       = useState(null)
  const [signalLog,   setSignalLog]   = useState([])

  const wsRef      = useRef(null)
  const reconnectRef = useRef(null)

  const connect = useCallback(() => {
    // Clear any pending reconnect timer before opening a new socket
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current)
      reconnectRef.current = null
    }

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      setError(null)
      console.log('WebSocket connected')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setTradeData(prev => {
          console.log('[WS] Message received, tick:', (prev?._tick ?? 0) + 1)
          return { ...data, _tick: (prev?._tick ?? 0) + 1 }
        })
        console.log('[WS] Candles in payload:', data?.candles?.length ?? 'none')
        setLastUpdate(new Date())

        // Append new signal to log (max 50 entries)
        if (data?.meta?.lastSignal) {
          setSignalLog(prev => {
            const entry = { ...data.meta.lastSignal, timestamp: Date.now() }
            const next = [entry, ...prev]
            return next.slice(0, 50)
          })
        }
      } catch (e) {
        console.error('WS parse error', e)
      }
    }

    ws.onerror = () => {
      setError('Connection error — is the bridge running?')
      setIsConnected(false)
    }

    ws.onclose = () => {
      setIsConnected(false)
      // Reconnect after 3 seconds unless the hook is unmounting
      reconnectRef.current = setTimeout(connect, 3000)
    }
  }, [url])

  useEffect(() => {
    connect()
    return () => {
      // Prevent reconnect loop on unmount
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null  // detach handler before closing
        wsRef.current.close()
      }
    }
  }, [connect])

  const sendMessage = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  const reconnect = useCallback(() => {
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current)
      reconnectRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.onclose = null  // prevent the auto-reconnect timer
      wsRef.current.close()
    }
    connect()
  }, [connect])

  return { tradeData, isConnected, lastUpdate, error, sendMessage, reconnect, signalLog }
}
