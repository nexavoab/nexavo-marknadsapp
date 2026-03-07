export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }[size]
  return (
    <div
      role="status"
      aria-label="Laddar..."
      className={`animate-spin rounded-full border-b-2 border-foreground ${s}`}
    />
  )
}

export function FullPageLoader() {
  return (
    <div className="h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  )
}
