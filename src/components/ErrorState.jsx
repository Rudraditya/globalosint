import { AlertTriangle, RefreshCw } from 'lucide-react'

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20">
        <AlertTriangle className="text-red-400" size={18} />
      </div>
      <div>
        <p className="text-zinc-300 text-sm font-medium mb-1">Failed to load data</p>
        <p className="text-zinc-600 text-xs max-w-xs leading-relaxed">{message || 'An unexpected error occurred.'}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-sm rounded-lg transition-colors border border-zinc-800 hover:border-zinc-700"
        >
          <RefreshCw size={13} />
          Try again
        </button>
      )}
    </div>
  )
}
