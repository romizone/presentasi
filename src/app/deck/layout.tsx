import "@/app/deck.css";

/** Deck routes need scrollable body (root layout uses overflow-hidden). */
export default function DeckLayout(props: LayoutProps<"/deck">) {
  return (
    <div
      style={{
        height: "100%",
        overflow: "auto",
        background: "#e8eef3",
      }}
    >
      {props.children}
    </div>
  );
}
