// Common nicknames for major US metros, used to broaden search queries
// beyond the literal city name (e.g. a search for "Austin" also tries "ATX").
// Not exhaustive -- just enough to catch club names that lean on local slang.
export const METRO_NICKNAMES: Record<string, string[]> = {
  austin: ["ATX"],
  "new york": ["NYC"],
  "new york city": ["NYC"],
  "los angeles": ["LA"],
  "san francisco": ["SF", "SF Bay"],
  chicago: ["Chi-town", "CHI"],
  philadelphia: ["Philly"],
  "washington": ["DC"],
  "washington dc": ["DC"],
  boston: ["Beantown"],
  "las vegas": ["Vegas"],
  "new orleans": ["NOLA"],
  seattle: ["Sea-Town", "PNW"],
  portland: ["PDX", "Rip City"],
  denver: ["Mile High"],
  atlanta: ["ATL"],
  miami: ["MIA", "305"],
  nashville: ["Nash"],
  charlotte: ["CLT"],
  minneapolis: ["Twin Cities", "MSP"],
  "st. paul": ["Twin Cities", "MSP"],
  dallas: ["DFW"],
  "fort worth": ["DFW"],
  houston: ["H-Town"],
  "san diego": ["SD"],
  phoenix: ["PHX"],
  detroit: ["Motor City", "the D"],
  pittsburgh: ["Pgh", "the Burgh"],
  "kansas city": ["KC"],
  cincinnati: ["Cincy"],
  columbus: ["Cbus"],
  indianapolis: ["Indy"],
  sacramento: ["Sac"],
  "salt lake city": ["SLC"],
  baltimore: ["Bmore"],
  memphis: ["901"],
};

export function getMetroNicknames(city: string | undefined): string[] {
  if (!city) return [];
  return METRO_NICKNAMES[city.trim().toLowerCase()] ?? [];
}
