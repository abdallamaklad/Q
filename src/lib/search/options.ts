// Client-safe option lists for the filter UI (no server imports).
export const CATEGORY_OPTIONS = [
  "fitness", "vegan", "beauty", "fashion", "gaming", "tech", "travel", "food", "cooking",
  "lifestyle", "family", "finance", "music", "comedy", "education", "sports",
  "skincare", "wellness", "photography", "art", "diy", "automotive", "outdoor", "home",
  "pets", "books", "dance", "real estate",
] as const;

// Middle East & North Africa region, added to the standard country set.
export const MENA_COUNTRIES = [
  "Algeria", "Bahrain", "Djibouti", "Egypt", "Iran", "Iraq", "Israel", "Jordan",
  "Kuwait", "Lebanon", "Libya", "Mauritania", "Morocco", "Oman", "Palestine",
  "Qatar", "Saudi Arabia", "Sudan", "Syria", "Tunisia", "United Arab Emirates", "Yemen",
] as const;

export const COUNTRY_OPTIONS = [
  "United States", "Germany", "United Kingdom", "France", "Spain", "Italy", "Brazil", "India",
  "Canada", "Australia", "Japan", "Mexico", "Netherlands", "Sweden", "Poland", "Nigeria",
  "Indonesia", "Turkey",
  ...MENA_COUNTRIES,
] as const;

export const LANGUAGE_OPTIONS = [
  "English", "German", "French", "Spanish", "Portuguese", "Italian", "Hindi", "Japanese",
  "Dutch", "Swedish", "Polish", "Turkish", "Indonesian", "Arabic", "Persian", "Hebrew",
] as const;

export const INTEREST_OPTIONS = [
  "fitness", "fashion", "beauty", "travel", "food", "gaming", "tech", "music",
  "sports", "finance", "family", "wellness", "art", "pets", "home", "real estate",
] as const;
