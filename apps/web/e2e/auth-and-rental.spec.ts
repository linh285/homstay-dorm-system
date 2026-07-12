import { expect, test, type Page } from '@playwright/test';

async function login(page: Page, username = 'sale01') {
  await page.goto('/login');
  await page.getByPlaceholder('sale01').fill(username);
  await page.getByPlaceholder('••••••••').fill('Password123!');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL('/');
}

test('Sale can log in and log out without console errors', async ({ page }) => {
  await login(page);
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await expect(page.getByText('Tổng quan công việc')).toBeVisible();
  await page.getByRole('button', { name: /SALE CN001/ }).click();
  const logoutItem = page.getByRole('menuitem', { name: /Đăng xuất/ });
  await expect(logoutItem).toBeVisible();
  const [logoutResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/auth/logout') &&
        response.request().method() === 'POST',
    ),
    logoutItem.press('Enter'),
  ]);
  expect(logoutResponse.status()).toBe(200);
  await expect(page).toHaveURL('/login');
  expect(errors).toEqual([]);
});

test('Sale matching UI uses Vietnamese display labels', async ({ page }) => {
  await login(page);
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/rental-requests/RR001');
  await page.getByRole('tab', { name: 'Phòng phù hợp' }).click();
  await page.getByRole('button', { name: 'Tìm phòng phù hợp' }).click();
  await expect(page.getByText('Điểm khớp: 2')).toBeVisible();
  await expect(page.getByText('Không phân biệt')).toBeVisible();
  await expect(page.getByText('Cao', { exact: true })).toBeVisible();
  await expect(page.getByText('SHARED_BEDS', { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Sale can inspect whole-room request and viewing scenarios', async ({
  page,
}) => {
  await login(page, 'sale00201');

  await page.goto('/rental-requests');
  await expect(page.getByText('RR002', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('main').getByText('Thuê nguyên phòng', { exact: true }),
  ).toBeVisible();

  await page.goto('/viewings');
  await expect(
    page.getByRole('main').getByText('Lịch xem phòng', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('main').getByRole('table')).toBeVisible();
});

test('Accountant can inspect payment-expiry and checkout scenarios but not reports', async ({
  page,
}) => {
  await login(page, 'accountant00402');

  await page.goto('/deposits');
  await expect(
    page.getByRole('main').getByText('Đặt cọc', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('D002', { exact: true })).toBeVisible();

  await page.goto('/check-out');
  await expect(page.getByText('Trả phòng, đối soát và hoàn cọc')).toBeVisible();

  await page.goto('/reports');
  await expect(page).toHaveURL('/forbidden');
});

test('Manager and Admin see their permitted operational reports', async ({
  browser,
}) => {
  const managerContext = await browser.newContext();
  const managerPage = await managerContext.newPage();
  await login(managerPage, 'manager01');
  await managerPage.goto('/check-in');
  await expect(managerPage.getByText('Nhận phòng và hợp đồng')).toBeVisible();
  await managerPage.goto('/reports');
  await expect(managerPage).toHaveURL('/reports');
  await managerContext.close();

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await login(adminPage, 'admin01');
  await adminPage.goto('/reports');
  await expect(adminPage).toHaveURL('/reports');
  await expect(
    adminPage.getByRole('heading', { name: 'Báo cáo toàn hệ thống' }),
  ).toBeVisible();
  await adminContext.close();
});
