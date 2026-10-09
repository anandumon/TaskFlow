import { apiError } from '@/server/utils/response'

export async function POST() {
  return apiError('External meeting integrations have been disabled', 404)
}
