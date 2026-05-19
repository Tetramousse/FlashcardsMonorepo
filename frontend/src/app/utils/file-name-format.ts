export interface FormattedFileName {
  fullName: string;
  displayName: string;
}

export function formatFileName(rawName: string): FormattedFileName {
  const fullName = rawName
    .replace(/\.pdf$/i, '')
    .replace(/_/g, ' ');

  const displayName = fullName.length > 20 ? `${fullName.substring(0, 20)}...` : fullName;

  return { fullName, displayName };
}
