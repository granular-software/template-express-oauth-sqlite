interface PageLayoutProps {
  children: React.ReactNode
}

export function PageLayout({ children }: PageLayoutProps) {
  return <main className="flex-1 overflow-y-auto min-h-screen bg-background">{children}</main>
} 