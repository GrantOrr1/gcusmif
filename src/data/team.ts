export type TeamMember = {
  name: string;
  role: string;
  sector?: string;
  bio?: string;
  photoUrl?: string;
  linkedinUrl?: string;
  email?: string;
  substackUrl?: string;
};

export const TEAM: TeamMember[] = [
  { name: "Colby Schmidt", role: "Portfolio Manager", email: "cschmidt34@my.gcu.edu" },
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
  { name: "Matthew St Arnold", role: "Analyst", sector: "Financials" },
  { name: "Sophia Topino", role: "Analyst", sector: "Financials" },
  { name: "Grant Orr", role: "Senior Analyst", sector: "Healthcare", email: "gorr@my.gcu.edu" },
  { name: "Jasmina Wessels", role: "Analyst", sector: "Healthcare" },
  { name: "Leon Ray", role: "Analyst", sector: "Healthcare", email: "LRay22@my.gcu.edu" },
  { name: "Maya Jacobs", role: "Analyst", sector: "Healthcare" },
  { name: "Ben Hughs", role: "Analyst", sector: "TMT" },
  { name: "Seth Herstedt", role: "Analyst", sector: "TMT" },
  { name: "Kyle Sebbern", role: "Analyst", sector: "TMT" },
  { name: "Sam Kingsbury", role: "Analyst", sector: "Energy" },
  { name: "Victor Estrada Leon", role: "Analyst", sector: "Energy" },
  { name: "Daniel Frohling", role: "Analyst", sector: "Energy" },
  { name: "Yakob Tsige Leggesse", role: "Analyst", sector: "Industrials" },
  { name: "Damon Harris", role: "Analyst", sector: "Industrials" },
  { name: "Freddy Escarrega", role: "Analyst", sector: "Consumer" },
  { name: "Maddy Field", role: "Analyst", sector: "Consumer" },
  { name: "Braden TeWinkel", role: "Analyst", sector: "Industrials" },
  { name: "Ahmet Azarov", role: "Analyst", sector: "Industrials" },
  { name: "Jada Wright", role: "Analyst", sector: "Consumer" },
  { name: "Jayden Nelson", role: "Analyst", sector: "TMT" },
  { name: "Eric Prabakaran", role: "Mentee Analyst", sector: "Healthcare" },
  { name: "Benson Pourbaix", role: "Mentee Analyst", sector: "TMT" },
  { name: "Ryan Kaupie", role: "Mentee Analyst", sector: "Consumer" },
  { name: "Savannah Burgara", role: "Mentee Analyst", sector: "Financials" },
  { name: "Leo Soter", role: "Mentee Analyst", sector: "Consumer" },
  { name: "Juliet Garrabrants", role: "Mentee Analyst", sector: "Financials" },
  { name: "Charlie Adams", role: "Mentee Analyst", sector: "Energy" },
  { name: "Jaron Castellanos", role: "Analyst", sector: "Fixed Income Advisor" },
  { name: "Michael Reed", role: "Alumni Advisor", sector: "Alumni Advisor" },
];
