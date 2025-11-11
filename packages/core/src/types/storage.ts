/**
 * Abstract storage interface for spec operations.
 * Enables platform-independent spec parsing and validation.
 * 
 * Implementations:
 * - FileSystemStorage: Node.js fs operations (CLI/MCP)
 * - GitHubStorage: GitHub API operations (Web)
 */
export interface SpecStorage {
  /**
   * Read a file as UTF-8 string
   */
  readFile(path: string): Promise<string>;
  
  /**
   * Write content to a file
   */
  writeFile(path: string, content: string): Promise<void>;
  
  /**
   * Check if a file or directory exists
   */
  exists(path: string): Promise<boolean>;
  
  /**
   * List all files in a directory (non-recursive)
   * Returns full paths
   */
  listFiles(dirPath: string): Promise<string[]>;
  
  /**
   * List all subdirectories in a directory (non-recursive)
   * Returns full paths
   */
  listDirs(dirPath: string): Promise<string[]>;
  
  /**
   * Get file metadata (optional - for stats/insights)
   */
  getFileStats?(path: string): Promise<{
    size: number;
    modified: Date;
  }>;
}

/**
 * Directory entry information
 */
export interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
}
