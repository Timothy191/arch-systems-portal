export function Table({ children }: { children: React.ReactNode }) {
  return <table>{children}</table>;
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return <thead>{children}</thead>;
}

export function TableRow({ children }: { children: React.ReactNode }) {
  return <tr>{children}</tr>;
}

export function TableCell({ children }: { children: React.ReactNode }) {
  return <td>{children}</td>;
}