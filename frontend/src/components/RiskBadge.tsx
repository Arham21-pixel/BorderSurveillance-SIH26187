export default function RiskBadge({ severity }: { severity: string }) {
  return <span className={`badge ${severity}`}>{severity}</span>;
}
