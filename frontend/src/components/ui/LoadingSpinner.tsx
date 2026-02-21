interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};

export default function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  return (
    <img
      src="/usa-logo.png"
      alt="Loading..."
      className={`${sizeClasses[size]} ${className} animate-pulse`}
    />
  );
}