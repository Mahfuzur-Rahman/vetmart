// app/api/v1/species/route.ts
// GET /api/v1/species — Static species list (§9)
import { SPECIES } from '@/lib/services/species';
import { apiSuccess } from '@/lib/api/response';

export async function GET() {
  return apiSuccess(SPECIES);
}
