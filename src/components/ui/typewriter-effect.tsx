import { cn } from "@/lib/utils";
import { motion, stagger, useAnimate, useInView } from "motion/react";
import { useEffect, useState } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   Word definition
   ───────────────────────────────────────────────────────────────────────────── */
export interface TypewriterWord {
  text: string;
  className?: string;
}

/* ─────────────────────────────────────────────────────────────────────────────
   TypewriterEffect — character-level stagger reveal with blinking cursor
   ───────────────────────────────────────────────────────────────────────────── */
interface TypewriterEffectProps {
  words: TypewriterWord[];
  /** Wrapper class — controls font-size, weight, alignment, etc. */
  className?: string;
  /** Class for the blinking cursor bar */
  cursorClassName?: string;
  /** Seconds between each character (default 0.055) */
  charDelay?: number;
}

export function TypewriterEffect({
  words,
  className,
  cursorClassName,
  charDelay = 0.055,
}: TypewriterEffectProps) {
  const wordsArray = words.map((word) => ({
    ...word,
    chars: word.text.split(""),
  }));

  const [scope, animate] = useAnimate();
  const isInView = useInView(scope);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isInView) return;
    animate(
      "span[data-char]",
      { display: "inline", opacity: 1 },
      { duration: 0, delay: stagger(charDelay), ease: "easeInOut" },
    ).then(() => setDone(true));
  }, [isInView, animate, charDelay]);

  return (
    <div className={cn("inline-flex flex-wrap items-baseline", className)}>
      <motion.div
        ref={scope}
        className="inline"
      >
        {wordsArray.map((word, wi) => (
          <span
            key={`word-${wi}`}
            className="inline"
          >
            {word.chars.map((char, ci) => (
              <motion.span
                data-char
                key={`char-${wi}-${ci}`}
                initial={{ opacity: 0, display: "none" }}
                className={cn("inline", word.className)}
              >
                {char}
              </motion.span>
            ))}
          </span>
        ))}
      </motion.div>

      {/* Cursor — blinks while typing, fades out once done */}
      <motion.span
        initial={{ opacity: 0 }}
        animate={done ? { opacity: 0 } : { opacity: 1 }}
        transition={
          done
            ? { duration: 0.4, ease: "easeOut" }
            : { duration: 0.7, repeat: Infinity, repeatType: "reverse" }
        }
        className={cn(
          "ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.05em] rounded-[1px] bg-[var(--brand-default)]",
          cursorClassName,
        )}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   TypewriterEffectSmooth — container-width expansion (works with any content)
   ───────────────────────────────────────────────────────────────────────────── */
interface TypewriterEffectSmoothProps {
  words: TypewriterWord[];
  className?: string;
  cursorClassName?: string;
  /** Animation duration in seconds (default 2) */
  duration?: number;
  /** Delay before starting in seconds (default 0.3) */
  delay?: number;
}

export function TypewriterEffectSmooth({
  words,
  className,
  cursorClassName,
  duration = 2,
  delay = 0.3,
}: TypewriterEffectSmoothProps) {
  const wordsArray = words.map((word) => ({
    ...word,
    chars: word.text.split(""),
  }));

  return (
    <div className={cn("inline-flex items-baseline", className)}>
      <motion.div
        className="overflow-hidden"
        initial={{ width: "0%" }}
        whileInView={{ width: "fit-content" }}
        transition={{ duration, ease: "linear", delay }}
      >
        <div style={{ whiteSpace: "nowrap" }}>
          {wordsArray.map((word, wi) => (
            <span key={`word-${wi}`}>
              {word.chars.map((char, ci) => (
                <span
                  key={`char-${wi}-${ci}`}
                  className={cn("inline", word.className)}
                >
                  {char}
                </span>
              ))}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Blinking cursor */}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, repeat: Infinity, repeatType: "reverse" }}
        className={cn(
          "ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.05em] rounded-[1px] bg-[var(--brand-default)]",
          cursorClassName,
        )}
      />
    </div>
  );
}
