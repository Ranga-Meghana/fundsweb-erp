interface StatusBadgeProps {
  status: string;
}

const statusStyles: { [key: string]: { bg: string; color: string } } = {
  DRAFT: { bg: "rgba(212, 162, 78, 0.15)", color: "#d4a24e" },
  CONFIRMED: { bg: "rgba(76, 175, 80, 0.15)", color: "#4caf50" },
  CANCELLED: { bg: "rgba(150, 150, 150, 0.15)", color: "#9a9ea6" },
  LEAD: { bg: "rgba(100, 149, 237, 0.15)", color: "#6495ed" },
  ACTIVE: { bg: "rgba(76, 175, 80, 0.15)", color: "#4caf50" },
  INACTIVE: { bg: "rgba(150, 150, 150, 0.15)", color: "#9a9ea6" },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const style = statusStyles[status] || { bg: "rgba(150,150,150,0.15)", color: "#9a9ea6" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 600,
        background: style.bg,
        color: style.color,
        letterSpacing: "0.3px",
      }}
    >
      {status}
    </span>
  );
}