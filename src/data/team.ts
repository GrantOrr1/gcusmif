export type TeamMember = {
  name: string;
  role: string;
  sector?: string;
  bio?: string;
  photoUrl?: string;
  linkedinUrl?: string;
  email?: string;
};

export const TEAM: TeamMember[] = [
  { name: "Colby Schmidt", role: "Portfolio Manager", email: "cschmidt34@my.gcu.edu" },
  { name: "Grant Orr", role: "Senior Analyst", sector: "Healthcare", email: "gorr@my.gcu.edu" },
  {
    name: "Carson Maxey",
    role: "Sector Head of Healthcare",
    sector: "Healthcare",
    email: "cmaxey4@my.gcu.edu",
  },
  { name: "Shane Feichtinger", role: "Sector Head of Industrials", sector: "Industrials" },
  { name: "Ethan Noel", role: "Sector Head of Energy", sector: "Energy" },
  { name: "Braden Abshire", role: "Sector Head of TMT", sector: "TMT" },
  { name: "Beau Brannnon", role: "Sector Head of Consumer", sector: "Consumer" },
  { name: "Matthew Albert", role: "Analyst" },
  { name: "Sophia Topinio", role: "Analyst", sector: "Financials" },
  { name: "Noah Luper", role: "Analyst" },
  { name: "Kyle Sebbern", role: "Analyst", sector: "Industrials" },
  { name: "Jasmina Wessels", role: "Analyst", sector: "Healthcare" },
  { name: "Leon Ray", role: "Analyst", sector: "Healthcare", email: "LRay22@my.gcu.edu" },
  { name: "Antwan Montanez", role: "Analyst", sector: "Healthcare" },
  { name: "Maya Jacobs", role: "Analyst", sector: "Healthcare" },
  { name: "Derek Criddle", role: "Analyst" },
  { name: "Ben Hughs", role: "Analyst", sector: "TMT" },
  { name: "Seth Herstedt", role: "Analyst" },
  { name: "Sam Kingsbury", role: "Analyst", sector: "Energy" },
  { name: "Victor Estrada Leon", role: "Analyst" },
  { name: "Caleb Bjerke", role: "Analyst", sector: "Energy" },
  { name: "Daniel Frohling", role: "Analyst", sector: "Energy" },
  { name: "Christian Carto", role: "Analyst" },
  { name: "Yakob Tsige Leggesse", role: "Analyst" },
  { name: "Damon Harris", role: "Analyst", sector: "Industrials" },
  { name: "Tony Shao Linos Dos Santos", role: "Analyst" },
  { name: "Freddy Escarrega", role: "Analyst" },
  { name: "Zach Blume", role: "Analyst" },
  { name: "Maddy Field", role: "Analyst", sector: "Consumer" },
  { name: "Nevaya Drotz", role: "Analyst", sector: "Consumer" },
  { name: "Braden TeWinkel", role: "Analyst" },
];
