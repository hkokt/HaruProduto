import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  getExpectedRole,
  loginWithKeycloak,
  requireBackend,
  requireCredentials,
} from './support/environment'

test.beforeEach(async ({ request }) => {
  await requireBackend(request)
})

test('authenticated user can access every domain module', async ({ page }) => {
  const credentials = requireCredentials()
  const expectedRole = getExpectedRole()

  await loginWithKeycloak(page, credentials)
  await expect(page.getByText('Backend Docker').locator('..')).toContainText('Disponível')

  await page.getByRole('link', { name: 'Produtos', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Produtos', level: 1 })).toBeVisible()
  await expect(page.getByLabel('Localizar produto')).toBeVisible()
  await assertRoleAction(page, expectedRole, 'Novo produto')

  await page.getByRole('link', { name: 'Estoque', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Estoque', level: 1 })).toBeVisible()
  await expect(page.getByLabel('Localizar produto no estoque')).toBeVisible()
  await assertRoleAction(page, expectedRole, 'Entrada de lote')

  await page.getByRole('link', { name: 'Produção', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Produção', level: 1 })).toBeVisible()
  await expect(page.getByLabel('Localizar ordem')).toBeVisible()
  await assertRoleAction(page, expectedRole, 'Nova ordem')

  await page.getByRole('link', { name: 'Como usar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Como usar o Haru', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Como usar cada módulo' })).toBeVisible()
})

async function assertRoleAction(
  page: Page,
  expectedRole: ReturnType<typeof getExpectedRole>,
  actionName: string,
) {
  if (!expectedRole) return

  const action = page.getByRole('button', { name: actionName })
  if (expectedRole === 'admin') {
    await expect(action).toBeVisible()
  } else {
    await expect(action).toHaveCount(0)
  }
}
