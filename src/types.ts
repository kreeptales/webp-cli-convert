export interface ConvertOptions {
  quality: number;
  lossless: boolean;
  output?: string;
  suffix: string;
  recursive: boolean;
  deleteOriginals: boolean;
  force: boolean;
}

export type ConversionOutcome =
  | {
      status: "converted";
      input: string;
      output: string;
      before: number;
      after: number;
      originalDeleted: boolean;
    }
  | { status: "skipped"; input: string; output: string }
  | { status: "failed"; input: string; error: Error };

export interface Summary {
  converted: number;
  skipped: number;
  failed: number;
  totalBefore: number;
  totalAfter: number;
}

export class CliError extends Error {
  constructor(
    message: string,
    public readonly exitCode: 1 | 2 = 1,
  ) {
    super(message);
    this.name = "CliError";
  }
}
