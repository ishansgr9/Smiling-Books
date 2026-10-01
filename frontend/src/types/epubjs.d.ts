declare module 'epubjs' {
  export interface NavItem {
    id: string;
    href: string;
    label: string;
    subitems?: NavItem[];
  }

  export interface Navigation {
    toc: NavItem[];
    get(target: string): NavItem | undefined;
  }

  export interface Location {
    start: {
      cfi: string;
      displayed: {
        page: number;
        total: number;
      };
      location: number;
      percentage: number;
    };
    end: {
      cfi: string;
      displayed: {
        page: number;
        total: number;
      };
      location: number;
      percentage: number;
    };
    atStart?: boolean;
    atEnd?: boolean;
  }

  export interface Rendition {
    display(target?: string | number): Promise<void>;
    next(): Promise<void>;
    prev(): Promise<void>;
    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback: (...args: any[]) => void): void;
    resize(width: number | string, height: number | string): void;
    destroy(): void;
    themes: {
      register(name: string, styles: any): void;
      select(name: string): void;
      fontSize(size: string): void;
      font(fontName: string): void;
    };
    location: Location;
    currentLocation(): Location;
  }

  export interface BookOptions {
    openAs?: string;
    encoding?: string;
    replacements?: string;
  }

  export interface Book {
    opened: Promise<any>;
    ready: Promise<any>;
    loaded: {
      navigation: Promise<Navigation>;
      metadata: Promise<any>;
      cover: Promise<string>;
    };
    navigation: Navigation;
    locations: {
      generate(chars?: number): Promise<string[]>;
      cfiFromPercentage(percentage: number): string;
      percentageFromCfi(cfi: string): number;
      locationFromCfi(cfi: string): number;
    };
    renderTo(element: HTMLElement | string, options?: any): Rendition;
    destroy(): void;
  }

  export default function ePub(urlOrData?: string | ArrayBuffer, options?: BookOptions): Book;
}
