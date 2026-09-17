<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\RestoreCaseController. Requires `cases.delete`. */
final class RestoreCaseDocs
{
    #[OA\Post(
        path: '/cases/{id}/restore',
        operationId: 'cases.restore',
        tags: ['Cases'],
        summary: 'Restore an archived case',
        description: 'Requires the `cases.delete` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The restored case', content: new OA\JsonContent(ref: '#/components/schemas/Case')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function restore(): void {}
}
