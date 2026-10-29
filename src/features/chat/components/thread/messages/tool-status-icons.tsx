import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckIcon as Check,
  ExclamationMarkIcon as Exclamation,
} from "@hugeicons/core-free-icons";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof HugeiconsIcon>, "icon">;
export const CheckIcon = (props: Props) => (
  <HugeiconsIcon
    icon={Check}
    size={16}
    {...props}
  />
);
export const ExclamationMarkIcon = (props: Props) => (
  <HugeiconsIcon
    icon={Exclamation}
    size={16}
    {...props}
  />
);
