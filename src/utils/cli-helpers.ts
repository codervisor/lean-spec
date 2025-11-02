/**
 * Parse custom fields from CLI --field options
 * @param fieldOptions Array of "name=value" strings
 * @returns Record of parsed field names and values
 */
export function parseCustomFieldOptions(fieldOptions?: string[]): Record<string, unknown> {
  const customFields: Record<string, unknown> = {};
  
  if (!fieldOptions) {
    return customFields;
  }
  
  for (const field of fieldOptions) {
    const [key, ...valueParts] = field.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('='); // Handle values with '=' in them
      customFields[key.trim()] = value.trim();
    }
  }
  
  return customFields;
}
