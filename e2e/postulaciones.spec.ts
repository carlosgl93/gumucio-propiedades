import { test, expect } from '@playwright/test';
import path from 'node:path';

test('admin can create postulación and see verdict panel after upload', async ({ page }) => {
  await page.goto('/admin/login');
  await page.fill('input[name="email"]', 'admin@gumucio.cl');
  await page.fill('input[name="password"]', 'test1234');
  await page.click('button[type="submit"]');

  await page.click('text=Postulaciones');
  await page.click('text=Nueva postulación');
  await page.click('[role="combobox"]');
  await page.locator('[role="option"]').first().click();
  await page.fill('input[name="applicantName"]', 'TEST USER');
  await page.fill('input[name="applicantRut"]', '12345678-5');
  await page.click('text=Crear');

  await page.setInputFiles('input[type="file"]', path.join(__dirname, 'fixtures/dicom-valid.pdf'));
  await expect(page.getByText(/PASS|WARN|FAIL|Verdict|Score/i)).toBeVisible({ timeout: 30_000 });
});

test('rejects non-PDF upload with inline error', async ({ page }) => {
  await page.goto('/admin/login');
  await page.fill('input[name="email"]', 'admin@gumucio.cl');
  await page.fill('input[name="password"]', 'test1234');
  await page.click('button[type="submit"]');

  await page.click('text=Postulaciones');
  await page.click('text=Nueva postulación');
  await page.locator('[role="combobox"]').click();
  await page.locator('[role="option"]').first().click();
  await page.fill('input[name="applicantName"]', 'TEST USER');
  await page.fill('input[name="applicantRut"]', '12345678-5');
  await page.click('text=Crear');

  await page.setInputFiles('input[type="file"]', {
    name: 'test.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  });
  await expect(page.getByText(/Solo PDF, máx 5MB/)).toBeVisible();
});