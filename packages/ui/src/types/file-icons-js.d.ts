declare module '@exuanbo/file-icons-js' {
  interface FileIcons {
    getClass(name: string, options?: { color?: boolean; array?: false }): Promise<string>;
    getClass(name: string, options: { color?: boolean; array: true }): Promise<string[]>;
  }
  const icons: FileIcons;
  export default icons;
}
