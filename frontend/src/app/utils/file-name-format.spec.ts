import { formatFileName } from './file-name-format';

describe('formatFileName', () => {
  it('should remove .pdf (case-insensitive) and replace underscores with spaces', () => {
    const result = formatFileName('My_file_NAME.PDF');

    expect(result.fullName).toBe('My file NAME');
    expect(result.displayName).toBe('My file NAME');
  });

  it('should truncate displayName to 20 chars plus ellipsis', () => {
    const result = formatFileName('questo_nome_file_e_molto_lungo.pdf');

    expect(result.fullName).toBe('questo nome file e molto lungo');
    expect(result.displayName).toBe('questo nome file e mo...');
  });
});
