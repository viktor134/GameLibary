import type { Commands, Direction } from './Commands.js';

/** Standard gamepad button indexes (Xbox layout). */
const Button = {
  A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, Start: 9,
  DpadUp: 12, DpadDown: 13, DpadLeft: 14, DpadRight: 15,
} as const;

const STICK_THRESHOLD = 0.5;
/** Delay before a held direction starts repeating, then the repeat rate. */
const REPEAT_DELAY_MS = 380;
const REPEAT_RATE_MS = 110;
const BUMPER_JUMP = 5;

type Control = Direction | 'a' | 'b' | 'x' | 'y' | 'start' | 'lb' | 'rb';

const DIRECTIONS: ReadonlySet<Control> = new Set<Control>(['left', 'right', 'up', 'down']);

/** Polls the first connected gamepad and turns presses into commands. */
export class GamepadInput {
  /** When each held control may fire again. */
  private readonly nextFire = new Map<Control, number>();
  private polling = false;

  constructor(private readonly commands: Commands) {
    window.addEventListener('gamepadconnected', () => this.start());
    if (navigator.getGamepads().some(Boolean)) this.start();
  }

  private start(): void {
    if (this.polling) return;
    this.polling = true;
    requestAnimationFrame(() => this.poll());
  }

  private poll(): void {
    const pad = navigator.getGamepads().find((p): p is Gamepad => p !== null);
    if (!pad) {
      this.polling = false; // resumes on the next 'gamepadconnected'
      return;
    }

    const now = performance.now();
    for (const [control, pressed] of this.readControls(pad)) {
      if (!pressed) {
        this.nextFire.delete(control);
        continue;
      }
      const next = this.nextFire.get(control);
      const isFirstPress = next === undefined;
      const repeats = DIRECTIONS.has(control);
      if (isFirstPress || (repeats && now >= next)) {
        this.nextFire.set(control, now + (isFirstPress ? REPEAT_DELAY_MS : REPEAT_RATE_MS));
        document.body.classList.add('gamepad');
        this.fire(control);
      }
    }
    requestAnimationFrame(() => this.poll());
  }

  private readControls(pad: Gamepad): [Control, boolean][] {
    const pressed = (index: number) => pad.buttons[index]?.pressed ?? false;
    const [x = 0, y = 0] = pad.axes;
    return [
      ['left', pressed(Button.DpadLeft) || x < -STICK_THRESHOLD],
      ['right', pressed(Button.DpadRight) || x > STICK_THRESHOLD],
      ['up', pressed(Button.DpadUp) || y < -STICK_THRESHOLD],
      ['down', pressed(Button.DpadDown) || y > STICK_THRESHOLD],
      ['a', pressed(Button.A)],
      ['b', pressed(Button.B)],
      ['x', pressed(Button.X)],
      ['y', pressed(Button.Y)],
      ['start', pressed(Button.Start)],
      ['lb', pressed(Button.LB)],
      ['rb', pressed(Button.RB)],
    ];
  }

  private fire(control: Control): void {
    const cmd = this.commands;
    switch (control) {
      case 'left': case 'right': case 'up': case 'down':
        return cmd.navigate(control);
      case 'a': return cmd.accept();
      case 'b': return cmd.back();
      case 'x': case 'y': return cmd.toggleOptions();
      case 'start': return cmd.toggleFullscreen();
      case 'lb': return cmd.jump(-BUMPER_JUMP);
      case 'rb': return cmd.jump(BUMPER_JUMP);
    }
  }
}
