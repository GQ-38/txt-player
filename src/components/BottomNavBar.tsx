import { Library as LibraryIcon, Compass, BookOpen, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';

export function BottomNavBar() {
  const location = useLocation();
  
  const navItems = [
    { icon: LibraryIcon, label: '书架', path: '/' },
    { icon: Compass, label: '发现', path: '/explore' },
    { icon: BookOpen, label: '阅读', path: '/library' },
    { icon: User, label: '个人中心', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-[#FDFCFB]/90 backdrop-blur-md border-t border-primary/10 shadow-[0_-4px_12px_rgba(27,77,62,0.08)] z-50 flex justify-around items-center px-4 rounded-t-xl md:hidden">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={clsx(
              "flex flex-col items-center justify-center transition-all duration-200",
              isActive ? "text-primary scale-105 font-bold" : "text-outline hover:text-primary"
            )}
          >
            <item.icon 
              size={24} 
              className={clsx("mb-1", isActive && "fill-current")} 
            />
            <span className="text-[11px]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
