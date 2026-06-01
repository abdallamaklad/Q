import { Badge } from "@/components/ui/badge";

/** Audience-quality style score: higher is better. */
export function QualityBadge({ score }: { score: number }) {
  const variant = score >= 70 ? "success" : score >= 45 ? "warning" : "destructive";
  return <Badge variant={variant}>{score}/100 quality</Badge>;
}

/** Fraud / fake-follower style score: higher is worse. */
export function FraudBadge({ score, label = "fake" }: { score: number; label?: string }) {
  const variant = score <= 20 ? "success" : score <= 40 ? "warning" : "destructive";
  return <Badge variant={variant}>{score}% {label}</Badge>;
}
