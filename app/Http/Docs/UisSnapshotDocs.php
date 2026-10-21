<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\RefreshUisSnapshotController.
 */
final class UisSnapshotDocs
{
    #[OA\Post(
        path: '/assessments/{assessment}/uis-snapshot/refresh',
        operationId: 'assessments.uisSnapshot.refresh',
        tags: ['Assessments'],
        summary: 'Refresh an intake\'s frozen UIS copy from the patient record',
        description: 'Replaces sections I and II of the sheet with the patient\'s current identity and family composition, and imports the patient\'s newest socio-economic record: family income, other income, house tenure, light and water, and the expense lines of section III. The imported values overwrite the assessment\'s own; a patient with no record, or a record holding no expense items, leaves the assessment\'s own untouched. Re-derives the classification against the new household size, income and expenses. Records who asked and when (`uis_snapshot_at`, `uis_snapshot_by`) and which record was imported (`socioeconomic_profile_id`). Everything else about the copy stays frozen — that is the point of it. A social case study is not a UIS (404). Requires the `cases.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'assessment', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The assessment with its new copy', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/Assessment'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function refresh(): void {}
}
