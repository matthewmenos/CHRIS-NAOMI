export type ProgramItem = {
  id: string;
  time: string;
  title: string;
  description: string;
};

export type WeddingProgram = {
  title: string;
  subtitle: string;
  items: ProgramItem[];
};

export const DEFAULT_WEDDING_PROGRAM: WeddingProgram = {
  title: "Wedding Day Program",
  subtitle: "A celebration of love, faith, and family.",
  items: [{
    id: "ceremony",
    time: "10:00 AM",
    title: "Wedding Ceremony",
    description: "The Church of Pentecost, Agona-Fie Assembly, Agona Nkwanta",
  }],
};
