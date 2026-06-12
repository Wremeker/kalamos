import { test, expect } from '@playwright/test';

test('create a document, edit the title, and persist across reload', async ({ page }) => {
  await page.goto('/');

  // Create a new document (navigates to #/doc/:id).
  await page.getByRole('button', { name: '+ New document' }).click();
  await expect(page).toHaveURL(/#\/doc\//);

  // Edit the title.
  const title = page.getByTestId('doc-title');
  await title.fill('My persisted document');

  // Wait for the debounced autosave to report success.
  await expect(page.getByTestId('save-state')).toHaveText('Saved', { timeout: 10_000 });

  // Reload and confirm the content was persisted by the backend.
  await page.reload();
  await expect(page.getByTestId('doc-title')).toHaveValue('My persisted document');
});
