import { motion, AnimatePresence } from 'framer-motion'
import { ShieldOff, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Props {
  open: boolean
  secondsLeft: number
  onStayLoggedIn: () => void
  onLogoutNow: () => void
}

export function SessionTimeoutModal({ open, secondsLeft, onStayLoggedIn, onLogoutNow }: Props) {
  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const label = mins > 0
    ? `${mins}m ${String(secs).padStart(2, '0')}s`
    : `${secs}s`

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div
            className="relative glass rounded-2xl w-full max-w-sm shadow-2xl p-6 flex flex-col gap-5"
            initial={{ scale: 0.92, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 12 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
          >
            {/* Icon */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 shrink-0">
                <Clock size={22} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-vault-text">Session expiring</h2>
                <p className="text-xs text-vault-muted mt-0.5">You've been inactive for a while</p>
              </div>
            </div>

            {/* Countdown */}
            <div className="bg-vault-elevated border border-vault-border rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-vault-muted">Logging out in</span>
              <span className="text-lg font-mono font-bold text-amber-400">{label}</span>
            </div>

            <p className="text-xs text-vault-muted">
              For your security, you'll be logged out automatically. Click <strong className="text-vault-text">Stay logged in</strong> to continue.
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={onStayLoggedIn} className="flex-1">
                Stay logged in
              </Button>
              <Button
                variant="outline"
                onClick={onLogoutNow}
                className="flex items-center gap-1.5 text-red-400 border-red-500/30 hover:bg-red-500/10"
              >
                <ShieldOff size={14} />
                Log out
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
