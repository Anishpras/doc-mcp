declare module 'cheerio' {
  // Basic type definitions for cheerio
  interface CheerioAPI {
    load(html: string, options?: any): CheerioStatic;
  }

  interface CheerioStatic {
    (selector: string): Cheerio;
    html(): string | null;
  }

  interface Cheerio {
    find(selector: string): Cheerio;
    remove(): void;
    text(): string;
    html(): string | null;
    children(): Cheerio;
    each(func: (index: number, element: any) => void): Cheerio;
    prop(name: string): any;
    length: number;
  }

  const cheerio: CheerioAPI & {
    default: CheerioAPI;
  };

  export = cheerio;
}
