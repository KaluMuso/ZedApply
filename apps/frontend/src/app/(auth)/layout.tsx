export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100dvh-7rem)] flex w-full max-w-7xl mx-auto flex-1 items-center justify-center px-4 py-8 sm:py-12">
      {children}
    </div>
  );
}
