/**
 * Minimal ESC/POS command builder. Standard thermal printer protocol only —
 * no brand-specific drivers.
 */
export class EscPosBuilder {
  private buffer: Buffer[] = [];

  private push(bytes: number[] | Buffer): void {
    this.buffer.push(Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes));
  }

  init(): this {
    this.push([0x1b, 0x40]); // ESC @  — initialize printer
    return this;
  }

  boldOn(): this {
    this.push([0x1b, 0x45, 0x01]);
    return this;
  }

  boldOff(): this {
    this.push([0x1b, 0x45, 0x00]);
    return this;
  }

  doubleHeightOn(): this {
    this.push([0x1d, 0x21, 0x11]);
    return this;
  }

  doubleHeightOff(): this {
    this.push([0x1d, 0x21, 0x00]);
    return this;
  }

  centerAlign(): this {
    this.push([0x1b, 0x61, 0x01]);
    return this;
  }

  leftAlign(): this {
    this.push([0x1b, 0x61, 0x00]);
    return this;
  }

  text(line: string): this {
    this.push(Buffer.from(line + '\n', 'utf-8'));
    return this;
  }

  divider(): this {
    this.push(Buffer.from('--------------------------------\n', 'utf-8'));
    return this;
  }

  feed(lines = 1): this {
    this.push([0x1b, 0x64, lines]);
    return this;
  }

  cutPaper(): this {
    this.push([0x1d, 0x56, 0x00]);
    return this;
  }

  build(): Buffer {
    return Buffer.concat(this.buffer);
  }
}
