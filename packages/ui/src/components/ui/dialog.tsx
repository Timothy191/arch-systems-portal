interface DialogPartProps {
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ children, className }: DialogPartProps) {
  return <div className={className}>{children}</div>;
}

export function DialogContent({ children, className }: DialogPartProps) {
  return <div className={className}>{children}</div>;
}

export function DialogHeader({ children, className }: DialogPartProps) {
  return <div className={className}>{children}</div>;
}

export function DialogTitle({ children, className }: DialogPartProps) {
  return <h2 className={className}>{children}</h2>;
}

export function DialogDescription({ children, className }: DialogPartProps) {
  return <p className={className}>{children}</p>;
}

export function DialogFooter({ children, className }: DialogPartProps) {
  return <div className={className}>{children}</div>;
}

export function DialogTrigger({ children, className }: DialogPartProps) {
  return <div className={className}>{children}</div>;
}

export function DialogClose({ children, className }: DialogPartProps) {
  return <div className={className}>{children}</div>;
}
