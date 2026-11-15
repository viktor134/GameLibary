/** Full-screen background that cross-fades between two layers. */
export class Background {
  private readonly layers: HTMLElement[];
  private active = 0;
  private currentUrl = '';

  constructor(container: HTMLElement) {
    this.layers = [...container.querySelectorAll<HTMLElement>('.layer')];
  }

  /** Fades to a new image once it has loaded. An empty url clears the background. */
  show(url: string, blurred = false): void {
    if (url === this.currentUrl) return;
    this.currentUrl = url;

    if (!url) {
      this.swap(url, blurred);
      return;
    }
    // Preload first so the fade never shows a half-drawn image.
    const image = new Image();
    image.onload = image.onerror = () => {
      if (this.currentUrl === url) this.swap(url, blurred);
    };
    image.src = url;
  }

  private swap(url: string, blurred: boolean): void {
    const previous = this.layers[this.active];
    this.active ^= 1;
    const next = this.layers[this.active];

    next.style.backgroundImage = url ? `url("${url}")` : 'none';
    next.classList.toggle('blurred', blurred);
    next.classList.add('on');
    previous.classList.remove('on');
  }
}
