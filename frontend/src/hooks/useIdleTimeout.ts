/**
 * Tracks user activity and fires callbacks when idle thresholds are crossed.
 *
 * - onWarn  : called when the user has been idle for `warnAfterMs`  (show warning)
 * - onLogout: called when the user has been idle for `logoutAfterMs` (force logout)
 *
 * Any user interaction (mouse, keyboard, touch, scroll) resets the timers.
 */
import { useEffect, useRef, useCallback } from 'react'

interface Options {
  warnAfterMs?: number    // default 13 min
  logoutAfterMs?: number  // default 15 min
  onWarn: () => void
  onLogout: () => void
  enabled: boolean
}

const WARN_DEFAULT   = 13 * 60 * 1000
const LOGOUT_DEFAULT = 15 * 60 * 1000

const ACTIVITY_EVENTS = [
  'mousemove', 'mousedown', 'keydown', 'touchstart', 'touchmove', 'scroll', 'wheel', 'click',
]

export function useIdleTimeout({
  warnAfterMs = WARN_DEFAULT,
  logoutAfterMs = LOGOUT_DEFAULT,
  onWarn,
  onLogout,
  enabled,
}: Options) {
  const warnTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warned      = useRef(false)

  const clear = useCallback(() => {
    if (warnTimer.current)   clearTimeout(warnTimer.current)
    if (logoutTimer.current) clearTimeout(logoutTimer.current)
  }, [])

  const reset = useCallback(() => {
    if (!enabled) return
    clear()
    warned.current = false
    warnTimer.current = setTimeout(() => {
      warned.current = true
      onWarn()
      logoutTimer.current = setTimeout(onLogout, logoutAfterMs - warnAfterMs)
    }, warnAfterMs)
  }, [enabled, warnAfterMs, logoutAfterMs, onWarn, onLogout, clear])

  useEffect(() => {
    if (!enabled) { clear(); return }
    reset()
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    return () => {
      clear()
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [enabled, reset, clear])

  /** Call this when the user chooses to extend their session from the warning modal */
  const extendSession = useCallback(() => {
    reset()
  }, [reset])

  return { extendSession }
}
