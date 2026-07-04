import { type CSSProperties } from "react";

const brandLetters = "HAROUGE ERP".split("");

const bluePalette = [
  "rgba(31, 118, 246, 0.22)",
  "rgba(18, 97, 216, 0.2)",
  "rgba(64, 148, 255, 0.2)"
];

const redPalette = [
  "rgba(225, 42, 53, 0.22)",
  "rgba(198, 34, 45, 0.2)",
  "rgba(244, 80, 89, 0.2)"
];

const letterEffectClasses = [
  "is-fx-float",
  "is-fx-twist",
  "is-fx-pop",
  "is-fx-sway",
  "is-fx-jitter"
] as const;

export function GlobalHarougeWordEffect() {
  return (
    <div className="global-harouge-overlay" aria-hidden="true">
      <div className="global-harouge-track">
        <div className="global-harouge-word">
          {brandLetters.map((letter, index) => {
            const isBlueTone = ((index * 7 + 3) % 10) < 5;
            const palette = isBlueTone ? bluePalette : redPalette;
            const color = palette[(index * 5 + 1) % palette.length];
            const effectClass = letterEffectClasses[index % letterEffectClasses.length];
            const letterStyle = {
              "--i": index,
              "--offset": index - 4.5,
              "--letter-color": color
            } as CSSProperties;

            return (
              <span
                className={`global-harouge-letter ${effectClass}${letter === " " ? " is-space" : ""}`}
                key={`${letter}-${index}`}
                style={letterStyle}
              >
                {letter === " " ? "\u00A0" : letter}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
