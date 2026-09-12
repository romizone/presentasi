import "@/app/deck.css";

export default function DevLayout(props: LayoutProps<"/dev">) {
  return (
    <div style={{ height: "100%", overflow: "auto", background: "#f4f6f8" }}>
      {props.children}
    </div>
  );
}
