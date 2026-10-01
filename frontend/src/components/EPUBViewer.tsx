import React, { useState, useEffect, useRef } from 'react';
import ePub from 'epubjs';
import type { Rendition, Book as EPubBookInstance, NavItem } from 'epubjs';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  List,
  Sun,
  Moon,
  Bookmark,
  X
} from 'lucide-react';

interface EPUBViewerProps {
  url: string;
  bookTitle?: string;
  authorName?: string;
}

type ThemeMode = 'dark' | 'light' | 'sepia';

export const EPUBViewer: React.FC<EPUBViewerProps> = ({ url, bookTitle }) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const bookRef = useRef<EPubBookInstance | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reader state
  const [toc, setToc] = useState<NavItem[]>([]);
  const [showToc, setShowToc] = useState(false);
  const [fontSize, setFontSize] = useState<number>(100);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [currentLocationText, setCurrentLocationText] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [currentChapter, setCurrentChapter] = useState<string>('');

  // Touch Swipe tracking
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    if (!viewerRef.current || !url) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    // Initialize epub.js book instance
    const book = ePub(url);
    bookRef.current = book;

    const rendition = book.renderTo(viewerRef.current, {
      width: '100%',
      height: '100%',
      flow: 'paginated',
      spread: 'auto',
      allowScriptedContent: false,
    });
    renditionRef.current = rendition;

    // Register theme styles
    rendition.themes.register('dark', {
      body: {
        background: '#0c0a09 !important',
        color: '#e7e5e4 !important',
        'font-family': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important',
        'line-height': '1.8 !important',
        padding: '0 20px !important',
      },
      'a, a:visited': { color: '#fb923c !important' },
      'h1, h2, h3, h4': { color: '#fafaf9 !important', 'font-family': 'serif !important' },
      p: { 'margin-bottom': '1.2em !important' },
    });

    rendition.themes.register('light', {
      body: {
        background: '#ffffff !important',
        color: '#1c1917 !important',
        'font-family': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important',
        'line-height': '1.8 !important',
        padding: '0 20px !important',
      },
      'a, a:visited': { color: '#ea580c !important' },
      'h1, h2, h3, h4': { color: '#0c0a09 !important', 'font-family': 'serif !important' },
      p: { 'margin-bottom': '1.2em !important' },
    });

    rendition.themes.register('sepia', {
      body: {
        background: '#fef3c7 !important',
        color: '#451a03 !important',
        'font-family': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important',
        'line-height': '1.8 !important',
        padding: '0 20px !important',
      },
      'a, a:visited': { color: '#b45309 !important' },
      'h1, h2, h3, h4': { color: '#292524 !important', 'font-family': 'serif !important' },
      p: { 'margin-bottom': '1.2em !important' },
    });

    rendition.themes.select(theme);
    rendition.themes.fontSize(`${fontSize}%`);

    // Load navigation (Table of Contents)
    book.loaded.navigation
      .then((nav) => {
        if (isMounted) {
          setToc(nav.toc || []);
        }
      })
      .catch((err) => {
        console.warn('Navigation could not be parsed:', err);
      });

    // Display book initial location
    rendition
      .display()
      .then(() => {
        if (isMounted) {
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to display EPUB:', err);
          setError(err.message || 'Failed to render the EPUB publication.');
          setLoading(false);
        }
      });

    // Generate location numbers for progress calculation
    book.ready
      .then(() => book.locations.generate(1000))
      .then(() => {
        if (isMounted && renditionRef.current) {
          const loc = renditionRef.current.currentLocation?.();
          if (loc && loc.start) {
            const percent = book.locations.percentageFromCfi(loc.start.cfi);
            setProgressPercent(Math.round(percent * 100));
          }
        }
      })
      .catch((e) => console.warn('Location generation note:', e));

    // Handle location change events
    rendition.on('relocated', (location: any) => {
      if (!isMounted) return;
      if (location && location.start) {
        setCurrentLocationText(`Location ${location.start.displayed?.page || location.start.location || ''}`);
        if (book.locations && book.locations.percentageFromCfi) {
          const percent = book.locations.percentageFromCfi(location.start.cfi);
          if (!isNaN(percent)) {
            setProgressPercent(Math.round(percent * 100));
          }
        }
      }
    });

    // Key navigation listener inside rendition iframe
    rendition.on('keyup', (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        rendition.next();
      } else if (e.key === 'ArrowLeft') {
        rendition.prev();
      }
    });

    // Resize handler
    const handleResize = () => {
      if (renditionRef.current && viewerRef.current) {
        renditionRef.current.resize(viewerRef.current.clientWidth, viewerRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      try {
        rendition.destroy();
        book.destroy();
      } catch (e) {
        console.warn('Cleanup error:', e);
      }
    };
  }, [url]);

  // Update theme when changed
  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.select(theme);
    }
  }, [theme]);

  // Update font size when changed
  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${fontSize}%`);
    }
  }, [fontSize]);

  const handleNext = () => {
    renditionRef.current?.next();
  };

  const handlePrev = () => {
    renditionRef.current?.prev();
  };

  const handleTocSelect = (href: string, label: string) => {
    renditionRef.current?.display(href);
    setCurrentChapter(label);
    setShowToc(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;

    if (Math.abs(diffX) > 50 && Math.abs(diffY) < 40) {
      if (diffX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const themeClasses = {
    dark: 'bg-stone-950 text-stone-100',
    light: 'bg-white text-stone-900',
    sepia: 'bg-amber-100 text-amber-950',
  };

  return (
    <div
      className={`relative w-full h-full flex flex-col overflow-hidden select-none ${themeClasses[theme]}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Reader secondary control toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-stone-800 bg-stone-900/90 backdrop-blur text-xs z-20">
        {/* Left: Table of Contents button & chapter title */}
        <div className="flex items-center space-x-2 min-w-0">
          <button
            onClick={() => setShowToc(!showToc)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg transition-all"
            title="Table of Contents"
            type="button"
          >
            <List size={14} />
            <span className="hidden sm:inline font-semibold text-[11px]">Chapters ({toc.length})</span>
          </button>
          {currentChapter && (
            <span className="text-[11px] text-stone-400 truncate max-w-[180px] sm:max-w-xs font-medium">
              {currentChapter}
            </span>
          )}
        </div>

        {/* Right: Theme controls & Font size */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Theme switcher */}
          <div className="flex items-center bg-stone-800 p-0.5 rounded-lg border border-stone-700">
            <button
              onClick={() => setTheme('dark')}
              className={`p-1.5 rounded-md transition-all ${theme === 'dark' ? 'bg-stone-950 text-white shadow-sm' : 'text-stone-400 hover:text-white'}`}
              title="Dark Theme"
              type="button"
            >
              <Moon size={12} />
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`p-1.5 rounded-md transition-all ${theme === 'light' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-white'}`}
              title="Light Theme"
              type="button"
            >
              <Sun size={12} />
            </button>
            <button
              onClick={() => setTheme('sepia')}
              className={`p-1.5 rounded-md transition-all ${theme === 'sepia' ? 'bg-amber-200 text-amber-900 shadow-sm' : 'text-stone-400 hover:text-white'}`}
              title="Sepia Theme"
              type="button"
            >
              <Bookmark size={12} />
            </button>
          </div>

          {/* Font size adjustment */}
          <div className="flex items-center bg-stone-800 rounded-lg border border-stone-700 px-1">
            <button
              onClick={() => setFontSize((prev) => Math.max(70, prev - 10))}
              className="px-1.5 py-1 text-stone-400 hover:text-white font-bold text-xs"
              title="Decrease Font Size"
              type="button"
            >
              A-
            </button>
            <span className="text-[10px] font-mono text-stone-300 px-1">{fontSize}%</span>
            <button
              onClick={() => setFontSize((prev) => Math.min(180, prev + 10))}
              className="px-1.5 py-1 text-stone-400 hover:text-white font-bold text-xs"
              title="Increase Font Size"
              type="button"
            >
              A+
            </button>
          </div>
        </div>
      </div>

      {/* Main EPUB Viewer Container */}
      <div className="relative flex-grow w-full h-full flex items-center justify-center overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 z-10 bg-stone-950/70 backdrop-blur-sm">
            <Loader2 className="animate-spin text-brand-500" size={36} />
            <p className="text-xs font-medium text-stone-300">Rendering EPUB book format...</p>
          </div>
        )}

        {error && (
          <div className="p-8 text-center max-w-md space-y-3 bg-stone-900 rounded-2xl border border-stone-800 text-red-400 z-10">
            <AlertCircle size={36} className="mx-auto" />
            <h3 className="font-serif text-base font-bold text-white">EPUB Rendering Error</h3>
            <p className="text-xs text-stone-400">{error}</p>
          </div>
        )}

        {/* EPUB iframe host element */}
        <div
          ref={viewerRef}
          className="w-full h-full max-w-4xl mx-auto px-2 sm:px-6 py-4 flex items-center justify-center shadow-inner"
        />

        {/* Side Click Navigation Buttons for Desktops */}
        <button
          onClick={handlePrev}
          className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700/60 shadow-lg transition-all z-10"
          aria-label="Previous Page"
          title="Previous Page (Left Arrow)"
          type="button"
        >
          <ChevronLeft size={22} />
        </button>
        <button
          onClick={handleNext}
          className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700/60 shadow-lg transition-all z-10"
          aria-label="Next Page"
          title="Next Page (Right Arrow)"
          type="button"
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Bottom Floating Navigation & Reading Progress */}
      <div className="bg-stone-900/95 border-t border-stone-800 px-4 py-2.5 flex items-center justify-between text-xs text-stone-300 select-none z-20">
        <button
          onClick={handlePrev}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-white font-semibold transition-all text-xs"
          type="button"
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Prev</span>
        </button>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-[11px] font-medium text-stone-400">
            <span>{progressPercent}% completed</span>
            {currentLocationText && <span className="hidden sm:inline">• {currentLocationText}</span>}
          </div>
        </div>

        <button
          onClick={handleNext}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-white font-semibold transition-all text-xs"
          type="button"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Table of Contents Drawer Modal */}
      {showToc && (
        <div className="fixed inset-0 z-40 bg-stone-950/70 backdrop-blur-sm flex justify-start">
          <div className="bg-stone-900 w-80 max-w-[85vw] h-full shadow-2xl border-r border-stone-800 flex flex-col animate-slideRight">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-white text-sm">Table of Contents</h3>
                {bookTitle && <p className="text-[10px] text-stone-400 truncate max-w-[200px]">{bookTitle}</p>}
              </div>
              <button
                onClick={() => setShowToc(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 overflow-y-auto flex-grow divide-y divide-stone-800/60 font-sans text-xs">
              {toc.length === 0 ? (
                <p className="p-4 text-center text-stone-500 text-xs">No explicit chapters listed.</p>
              ) : (
                toc.map((item, idx) => (
                  <button
                    key={item.id || idx}
                    onClick={() => handleTocSelect(item.href, item.label)}
                    className="w-full text-left py-2.5 px-3 rounded-lg hover:bg-stone-800 text-stone-300 hover:text-white transition-all flex items-center justify-between group"
                    type="button"
                  >
                    <span className="truncate pr-2 font-medium">{item.label}</span>
                    <ChevronRight size={12} className="text-stone-600 group-hover:text-stone-300 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EPUBViewer;
