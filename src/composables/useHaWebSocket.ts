import { ref } from 'vue'
import type { HaState } from '../config'

type WsState = 'connecting' | 'connected' | 'authenticated' | 'disconnected' | 'error'

/**
 * HA WebSocket composable — subscribes to state_changed events.
 * Falls back gracefully: if WS fails, polling in useHa still works.
 */
export function useHaWebSocket(
  haTarget: () => string,
  haToken: () => string,
  onStateChanged: (entityId: string, newState: HaState) => void,
) {
  const wsState = ref<WsState>('disconnected')
  let ws: WebSocket | null = null
  let msgId = 1
  let reconnectTimer: number | null = null
  let pingTimer: number | null = null
  let shouldReconnect = true

  function resetSocket(socket: WebSocket) {
    socket.onopen = null
    socket.onmessage = null
    socket.onerror = null
    socket.onclose = null
  }

  function getWsUrl() {
    const base = haTarget()
    // haTarget might be /ha-api (proxied) or a direct address
    // For WebSocket we need a direct ws:// URL to the HA instance
    // If it starts with http, convert; if it's a relative path, use current host
    if (base.startsWith('http://')) {
      return base.replace('http://', 'ws://') + '/api/websocket'
    }
    if (base.startsWith('https://')) {
      return base.replace('https://', 'wss://') + '/api/websocket'
    }
    // Relative path like /ha-api — use current page host with ws
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${location.host}${base}/api/websocket`
  }

  function connect() {
    shouldReconnect = true
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    stopPing()

    if (ws) {
      const prev = ws
      ws = null
      resetSocket(prev)
      try { prev.close() } catch { /* ignore */ }
    }

    const token = haToken()
    if (!token) {
      wsState.value = 'error'
      return
    }

    try {
      const url = getWsUrl()
      const socket = new WebSocket(url)
      ws = socket
      wsState.value = 'connecting'

      socket.onopen = () => {
        if (ws !== socket) return
        wsState.value = 'connected'
      }

      socket.onmessage = (event) => {
        if (ws !== socket) return
        let data: any
        try { data = JSON.parse(event.data) } catch { return }

        if (data.type === 'auth_required') {
          // Authenticate
          ws?.send(JSON.stringify({ type: 'auth', access_token: haToken() }))
        } else if (data.type === 'auth_ok') {
          wsState.value = 'authenticated'
          // Subscribe to state changes
          ws?.send(JSON.stringify({ id: msgId++, type: 'subscribe_events', event_type: 'state_changed' }))
          startPing()
        } else if (data.type === 'auth_invalid') {
          shouldReconnect = false
          wsState.value = 'error'
          console.warn('[yumu-ws] auth invalid:', data.message)
          ws?.close()
        } else if (data.type === 'event' && data.event?.event_type === 'state_changed') {
          const newState = data.event.data?.new_state as HaState | undefined
          if (newState) {
            onStateChanged(newState.entity_id, newState)
          }
        } else if (data.type === 'pong') {
          // heartbeat ok
        }
      }

      socket.onerror = () => {
        if (ws !== socket) return
        wsState.value = 'error'
      }

      socket.onclose = () => {
        if (ws === socket) {
          ws = null
        }
        stopPing()
        wsState.value = 'disconnected'
        if (shouldReconnect) {
          scheduleReconnect()
        }
      }
    } catch {
      wsState.value = 'error'
      scheduleReconnect()
      return
    }
  }

  function startPing() {
    stopPing()
    pingTimer = window.setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ id: msgId++, type: 'ping' }))
      }
    }, 30000)
  }

  function stopPing() {
    if (pingTimer !== null) {
      clearInterval(pingTimer)
      pingTimer = null
    }
  }

  function scheduleReconnect() {
    if (!shouldReconnect || reconnectTimer !== null) return
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null
      connect()
    }, 5000)
  }

  function disconnect() {
    shouldReconnect = false
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    stopPing()
    if (ws) {
      const socket = ws
      ws = null
      resetSocket(socket)
      try { socket.close() } catch { /* ignore */ }
    }
    wsState.value = 'disconnected'
  }

  return { wsState, connect, disconnect }
}
