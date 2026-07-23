import { expect, test } from '@playwright/test'
import { loginWithKeycloak, requireBackend, requireCredentials } from './support/environment'

test.beforeEach(async ({ request }) => {
  await requireBackend(request)
})

test('login page exposes authentication and registration actions', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByRole('heading', { name: 'Acesse sua conta' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Entrar com Keycloak' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Criar uma conta' })).toBeVisible()
})

test('registration action opens the haru realm registration flow', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Criar uma conta' }).click()

  await expect(page).toHaveURL(/\/auth\/realms\/haru\/.*registration/)
  await expect(page.locator('input[name="username"]')).toBeVisible()
})

test('configured realm user can log in and log out', async ({ page }) => {
  const credentials = requireCredentials()
  await loginWithKeycloak(page, credentials)

  await expect(page.getByText('Conectado', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Sair' }).click()

  await expect(page).toHaveURL(/\/login(?:$|\?)/, { timeout: 30_000 })
  await expect(page.getByRole('button', { name: 'Entrar com Keycloak' })).toBeVisible()
})
