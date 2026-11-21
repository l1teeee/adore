import GlyphField from "@/components/glyph-field/glyph-field";

export default function Home() {
  return (
    <main>
      <GlyphField
        words={["ADORE", "AMOR", "ARTE", "ALMA", "LUZ"]}
        cellWidth={30}
        cellHeight={32}
        minColumns={21}
        className="h-svh w-full p-6 md:p-10"
      />
    </main>
  );
}
