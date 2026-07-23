import { expect, test, type Response } from '@playwright/test'
import {
  loginWithKeycloak,
  requireBackend,
  requireCredentials,
  requireEnvironmentValue,
} from './support/environment'

function isFirstSearchPage(response: Response, path: string, query: string) {
  const url = new URL(response.url())
  return (
    response.request().method() === 'GET' &&
    url.pathname === path &&
    url.searchParams.get('q') === query &&
    url.searchParams.get('offset') === '0' &&
    url.searchParams.get('limit') === '20'
  )
}

test.beforeEach(async ({ request }) => {
  await requireBackend(request)
})

test('product search reads matching data from the real API', async ({ page }) => {
  const credentials = requireCredentials()
  const productQuery = requireEnvironmentValue('E2E_PRODUCT_QUERY')

  await loginWithKeycloak(page, credentials)
  await page.getByRole('link', { name: 'Produtos', exact: true }).click()
  await page.getByLabel('Localizar produto').fill(productQuery)

  const responsePromise = page.waitForResponse((response) =>
    isFirstSearchPage(response, '/api/products/search', productQuery),
  )
  await page.getByRole('button', { name: 'Consultar' }).click()
  const response = await responsePromise

  expect(response.ok()).toBe(true)
  await expect(page.locator('.product-search-result').first()).toBeVisible()

  const expectedName = process.env.E2E_PRODUCT_EXPECTED_NAME?.trim()
  if (expectedName) {
    await expect(page.getByText(expectedName, { exact: true }).first()).toBeVisible()
  }
})

test('inventory lookup reads availability from the real API', async ({ page }) => {
  const credentials = requireCredentials()
  const productId = requireEnvironmentValue('E2E_INVENTORY_PRODUCT_ID')

  await loginWithKeycloak(page, credentials)
  await page.getByRole('link', { name: 'Estoque', exact: true }).click()

  const searchResponsePromise = page.waitForResponse((response) =>
    isFirstSearchPage(response, '/api/inventory/products/search', productId),
  )
  await page.getByRole('searchbox', { name: 'Localizar produto no estoque' }).fill(productId)
  await page.getByRole('button', { name: 'Consultar' }).click()
  const searchResponse = await searchResponsePromise

  expect(searchResponse.ok()).toBe(true)

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/inventory/products/${productId}/availability`) &&
      response.request().method() === 'GET',
  )
  await page
    .getByRole('button')
    .filter({ hasText: `ID ${productId}` })
    .first()
    .click()
  const response = await responsePromise

  expect(response.ok()).toBe(true)
  await expect(page.getByText('Disponibilidade atual', { exact: true })).toBeVisible()
})

test('production lookup reads an order from the real API', async ({ page }) => {
  const credentials = requireCredentials()
  const orderId = requireEnvironmentValue('E2E_PRODUCTION_ORDER_ID')

  await loginWithKeycloak(page, credentials)
  await page.getByRole('link', { name: 'Produção', exact: true }).click()
  await page.getByLabel('Localizar ordem').fill(orderId)

  const searchResponsePromise = page.waitForResponse((response) =>
    isFirstSearchPage(response, '/api/production-orders/search', orderId),
  )
  await page.getByRole('button', { name: 'Consultar' }).click()
  const searchResponse = await searchResponsePromise
  expect(searchResponse.ok()).toBe(true)

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/production-orders/${orderId}`) &&
      response.request().method() === 'GET',
  )
  await page.getByRole('button', { name: new RegExp(`Ordem #${orderId}`) }).click()
  const response = await responsePromise

  expect(response.ok()).toBe(true)
  await expect(
    page.locator('.production-detail .eyebrow').getByText(`Ordem #${orderId}`, { exact: true }),
  ).toBeVisible()
})
