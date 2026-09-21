export type Rating = "Strong Sell" | "Sell" | "Underperform" | "Hold" | "Buy" | "Strong Buy" | "Strong Hold";

export const RATINGS: Rating[] = [
  "Strong Sell",
  "Sell",
  "Underperform",
  "Hold",
  "Buy",
  "Strong Buy",
  "Strong Hold",
];

export function isRating(value: unknown): value is Rating {
  return typeof value === "string" && (RATINGS as string[]).includes(value);
}

export function ratingTone(rating: Rating | null): "positive" | "negative" | "neutral" {
  if (rating === "Buy" || rating === "Strong Buy" || rating === "Strong Hold") return "positive";
  if (rating === "Sell" || rating === "Strong Sell" || rating === "Underperform") return "negative";
  return "neutral";
}
