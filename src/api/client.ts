import type { ApiProblem } from './types'

export class ApiError extends Error {
  status: number
  problem: ApiProblem

  constructor(status: number, problem: ApiProblem) {
    super(translateProblem(problem, status))
    this.status = status
    this.problem = problem
  }
}

const problemMessages: Record<string, string> = {
  AUTHENTICATION_REQUIRED: 'Sua sessão expirou. Entre novamente.',
  ACCESS_DENIED: 'Você não tem permissão para realizar esta operação.',
  RESOURCE_NOT_FOUND: 'O recurso solicitado não foi encontrado.',
  DUPLICATE_RESOURCE: 'Já existe um registro com esses dados.',
  PRODUCT_COMPOSITION_CYCLE: 'Este componente criaria um ciclo na composição do produto.',
  INVALID_PRODUCT_COMPOSITION: 'A composição informada é inválida.',
  PRODUCT_SEARCH_UNAVAILABLE:
    'A busca de produtos está temporariamente indisponível. Tente novamente em instantes.',
  INVENTORY_CONFLICT: 'A operação conflita com o estado atual do estoque.',
  INVALID_INVENTORY_OPERATION: 'A operação de estoque é inválida.',
  PRODUCTION_ORDER_STATE_CONFLICT: 'A ordem não permite esta operação no estado atual.',
  INVALID_PRODUCTION_ORDER: 'A ordem de produção informada é inválida.',
  VALIDATION_FAILED: 'Revise os campos informados e tente novamente.',
  MALFORMED_REQUEST: 'A requisição enviada não pôde ser interpretada.',
  INVALID_REQUEST_PARAMETER: 'Um dos parâmetros informados possui formato inválido.',
  METHOD_NOT_ALLOWED: 'Esta operação não é permitida para o recurso.',
  UNSUPPORTED_MEDIA_TYPE: 'O formato enviado não é aceito pelo servidor.',
  NOT_ACCEPTABLE: 'O formato solicitado não está disponível.',
  REQUEST_REJECTED: 'A solicitação foi recusada pelo servidor.',
  INTERNAL_SERVER_ERROR: 'O servidor encontrou um erro. Tente novamente em instantes.',
  OPTIMISTIC_LOCK_CONFLICT:
    'O registro foi alterado por outra pessoa. Consulte novamente e repita a operação.',
  DATA_INTEGRITY_VIOLATION: 'A operação viola uma regra de integridade dos dados.',
}

function translateProblem(problem: ApiProblem, status: number) {
  if (problem.code && problemMessages[problem.code]) return problemMessages[problem.code]
  if (status >= 500) return 'O servidor encontrou um erro. Tente novamente em instantes.'
  return 'Não foi possível concluir a operação.'
}

export async function apiRequest<T>(
  path: string,
  getToken: () => Promise<string>,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken()
  let response: Response
  try {
    response = await fetch(path, {
      ...options,
      headers: {
        Accept: 'application/json, application/problem+json',
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new Error(
      'Não foi possível conectar ao backend local. Confirme se o Docker está em execução.',
    )
  }
  if (!response.ok) {
    const problem = (await response.json().catch(() => ({}))) as ApiProblem
    throw new ApiError(response.status, problem)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function jsonBody(value: unknown) {
  return JSON.stringify(value)
}
