<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\MswdClassificationMatrixController. */
final class MswdClassificationMatrixDocs
{
    #[OA\Get(
        path: '/mswd-classification-matrix',
        operationId: 'mswd-classification-matrix.index',
        tags: ['Reference'],
        summary: 'List the MSWD classification matrix rows',
        description: 'Requires the `cases.view` permission.',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Matrix rows', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/MswdClassificationMatrix')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function index(): void {}
}
