export const metadata = { robots: "noindex" };

export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: 0, margin: 0, background: "transparent" }}>
      {children}
    </div>
  );
}
