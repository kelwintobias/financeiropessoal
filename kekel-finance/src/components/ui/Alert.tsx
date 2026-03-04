interface AlertProps {
  message: string
  onDismiss: () => void
}

export default function Alert({ message, onDismiss }: AlertProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-red-100 border-b-2 border-red-300 text-red-800 px-4 py-3 text-sm shadow-md">
      <span>{message}</span>
      <button
        onClick={onDismiss}
        aria-label="Dispensar alerta"
        className="ml-4 text-red-600 hover:text-red-900 text-xl font-bold leading-none"
      >
        ×
      </button>
    </div>
  )
}
