export type GenerateProgress =
  | { stage: "ingest"; message: string }
  | { stage: "plan"; message: string }
  | { stage: "slides"; message: string; done: number; total: number }
  | { stage: "validate"; message: string }
  | { stage: "images"; message: string }
  | { stage: "done"; message: string };

export type ProgressHandler = (event: GenerateProgress) => void;
