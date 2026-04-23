import { Book } from 'lucide-react';

export function TopAppBar() {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#FDFCFB]/80 backdrop-blur-md border-b border-primary/10 shadow-sm z-40">
      <div className="max-w-7xl mx-auto px-6 h-full flex justify-center items-center gap-2">
        <Book size={20} className="text-primary" />
        <h1 className="text-xl font-bold text-primary tracking-tight font-sans">避风港书屋</h1>
      </div>
    </header>
  );
}
