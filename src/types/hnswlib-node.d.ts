declare module 'hnswlib-node' {
  export class HierarchicalNSW {
    constructor(space: string, dim: number);
    
    // Index initialization and persistence
    initIndex(maxElements: number, efConstruction?: number, M?: number): void;
    readIndexSync(filename: string): void;
    writeIndexSync(filename: string): void;
    
    // Point operations
    addPoint(point: number[], label: number): void;
    removePoint(label: number): void;
    
    // Search operations
    searchKnn(query: number[], k: number, filter?: (label: number) => boolean): { 
      distances: number[], 
      neighbors: number[] 
    };
    
    // Utilities
    getMaxElements(): number;
    getCurrentCount(): number;
    setEf(ef: number): void;
    getEf(): number;
  }
}
