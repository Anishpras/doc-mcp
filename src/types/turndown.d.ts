declare module 'turndown' {
  interface TurndownOptions {
    headingStyle?: 'setext' | 'atx';
    hr?: string;
    bulletListMarker?: '-' | '+' | '*';
    codeBlockStyle?: 'indented' | 'fenced';
    emDelimiter?: '_' | '*';
    strongDelimiter?: '__' | '**';
    linkStyle?: 'inlined' | 'referenced';
    linkReferenceStyle?: 'full' | 'collapsed' | 'shortcut';
  }

  interface TurndownRule {
    filter: string | string[] | ((node: Node) => boolean);
    replacement: (content: string, node: Node, options: TurndownOptions) => string;
  }

  class TurndownService {
    constructor(options?: TurndownOptions);
    addRule(key: string, rule: TurndownRule): this;
    turndown(input: string | Node | DocumentFragment): string;
  }

  export = TurndownService;
}
