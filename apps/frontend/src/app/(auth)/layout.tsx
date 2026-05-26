export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100dvh-7rem)] flex w-full flex-1 items-stretch justify-center px-0 py-0 sm:py-4">
      {children}
    </div>
  );
}
