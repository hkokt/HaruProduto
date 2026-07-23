import { expect, test } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'

export type ExpectedRole = 'admin' | 'customer'

export interface TestCredentials {
  username: string
  password: string
}

export async function requireBackend(request: APIRequestContext) {
  let available = false

  try {
    const response = await request.get('/nginx-health', {
      failOnStatusCode: false,
      timeout: 5_000,
    })
    available = response.ok()
  } catch {
    available = false
  }

  test.skip(
    !available,
    'The local Docker backend is unavailable. Start HaruProdutoAPI/docker before running E2E tests.',
  )
}

export function requireCredentials(): TestCredentials {
  const username = process.env.E2E_USERNAME?.trim()
  const password = process.env.E2E_PASSWORD

  test.skip(
    !username || !password,
    'Set E2E_USERNAME and E2E_PASSWORD to a user from the haru realm.',
  )

  if (!username || !password) {
    throw new Error('E2E credentials are required after the test precondition check.')
  }

  return { username, password }
}

export function getExpectedRole(): ExpectedRole | undefined {
  const value = process.env.E2E_EXPECTED_ROLE?.trim().toLowerCase()

  if (!value) return undefined
  if (value === 'admin' || value === 'customer') return value

  throw new Error('E2E_EXPECTED_ROLE must be either "admin" or "customer".')
}

export function requireEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim()
  test.skip(!value, `Set ${name} to enable this live-data scenario.`)

  if (!value) {
    throw new Error(`${name} is required after the test precondition check.`)
  }

  return value
}

export async function loginWithKeycloak(page: Page, credentials: TestCredentials) {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Entrar com Keycloak' }).click()

  await expect(page).toHaveURL(/\/auth\/realms\/haru\//)

  const usernameInput = page.locator('input[name="username"]')
  const passwordInput = page.locator('input[name="password"]')
  const submitButton = page.locator('#kc-login')

  await usernameInput.fill(credentials.username)

  if (!(await passwordInput.isVisible())) {
    await submitButton.click()
    await passwordInput.waitFor({ state: 'visible' })
  }

  await passwordInput.fill(credentials.password)
  await submitButton.click()

  await expect(page).toHaveURL(/\/app(?:\/|$|\?)/, { timeout: 30_000 })
  await expect(page.getByRole('heading', { name: /Olá, /, level: 1 })).toBeVisible()
}
