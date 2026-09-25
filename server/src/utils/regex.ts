// Shared by any controller building a case-insensitive `$regex` filter from
// user input (product/category search, user email search, etc.) — escapes
// regex-special characters so a bare "+", "(", etc. in the search term can't
// throw or change what the pattern matches.
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
