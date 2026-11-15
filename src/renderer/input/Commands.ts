export type Direction = 'left' | 'right' | 'up' | 'down';

/** Everything a keyboard or gamepad can ask the app to do. */
export interface Commands {
  navigate(direction: Direction): void;
  /** Jump several cards at once (gamepad bumpers). */
  jump(by: number): void;
  first(): void;
  last(): void;
  accept(): void;
  back(): void;
  /** Open the options menu, or close the current menu. */
  toggleOptions(): void;
  toggleFullscreen(): void;
  typeSearch(char: string): void;
  eraseSearch(): void;
  readonly isMenuOpen: boolean;
  readonly isSearching: boolean;
}
