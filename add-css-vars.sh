#!/bin/bash

# Add interactive and status colors after line 141 (:root section)
sed -i '141 a\
\
  /* Interactive State Colors */\
  --color-interactive-hover: oklch(0.95 0.02 280);\
  --color-interactive-active: oklch(0.90 0.04 280);\
  --color-interactive-disabled: oklch(0.85 0 0);\
  --color-interactive-focus: oklch(0.60 0.20 250);\
\
  /* Status Colors */\
  --color-semantic-pending: oklch(0.60 0.15 280);\
  --color-semantic-pending-light: oklch(0.93 0.06 280);\
  --color-semantic-processing: oklch(0.60 0.18 220);\
  --color-semantic-processing-light: oklch(0.93 0.08 220);' src/app/globals.css
