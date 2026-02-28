/**
 * Re-export nuqs primitives so existing imports from this path continue to work.
 * nuqs is Next.js-native and handles URL search params correctly.
 */
export {
  parseAsString,
  parseAsInteger,
  useQueryState,
  useQueryStates,
} from "nuqs";
