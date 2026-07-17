export function Tabs({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

export function TabsList({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

export function TabsTrigger({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props}>{children}</button>;
}

export function TabsContent({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}