export default function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="w-8 h-8 border-2 border-odisseia-gold/30 border-t-odisseia-gold rounded-full animate-spin" />
    </div>
  );
}
