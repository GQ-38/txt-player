import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { Bookshelf } from './pages/Bookshelf';
import { ReadingView } from './pages/ReadingView';
import { Profile } from './pages/Profile';
import { Library } from './pages/Library';
import { Explore } from './pages/Explore';
import { Auth } from './pages/Auth';
import { History } from './pages/History';
import { Settings } from './pages/Settings';
import { Help } from './pages/Help';
import { CheckIn } from './pages/CheckIn';
import { BottomNavBar } from './components/BottomNavBar';
import { TopAppBar } from './components/TopAppBar';
import { StoreProvider } from './store';
import { GlobalPlayerWidget } from './components/GlobalPlayerWidget';
import { useStore } from './store';

function AppContent() {
  const { theme, followSystemTheme } = useStore();
  const location = useLocation();
  const isReadingMode =
    location.pathname.startsWith('/reading') ||
    location.pathname.startsWith('/auth') ||
    location.pathname === '/check-in';

  const themeColors = {
    day: {
      bg: '#FCF9F8',
      text: '#1B1C1C',
      surface: '#FFFFFF',
      surfaceVariant: '#E4E2E1',
    },
    eye: {
      bg: '#F8F5EE',
      text: '#2C2C2C',
      surface: '#FCFAF5',
      surfaceVariant: '#EBE9E2',
    },
    night: {
      bg: '#1B1C1C',
      text: '#DCD9D9',
      surface: '#252626',
      surfaceVariant: '#313333',
    },
  };

  const currentColors = followSystemTheme ? themeColors[theme] : themeColors.day;

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-x-hidden transition-colors duration-500"
      style={{
        backgroundColor: currentColors.bg,
        color: currentColors.text,
        ['--color-surface' as any]: currentColors.surface,
        ['--color-background' as any]: currentColors.bg,
        ['--color-on-surface' as any]: currentColors.text,
        ['--color-surface-container-lowest' as any]: currentColors.surface,
        ['--color-surface-variant' as any]: currentColors.surfaceVariant,
      }}
    >
      {!isReadingMode && <TopAppBar />}

      <main className={`min-h-0 flex-grow ${!isReadingMode ? 'pt-16 pb-24' : ''}`}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Bookshelf />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/reading/:id" element={<ReadingView />} />
            <Route path="/library" element={<Library />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/help" element={<Help />} />
            <Route path="/check-in" element={<CheckIn />} />
          </Routes>
        </AnimatePresence>
      </main>

      {!isReadingMode && <BottomNavBar />}
      <GlobalPlayerWidget />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Router>
        <AppContent />
      </Router>
    </StoreProvider>
  );
}
