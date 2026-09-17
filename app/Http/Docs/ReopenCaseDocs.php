<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\ReopenCaseController. Requires `cases.update`. */
final class ReopenCaseDocs
{
    #[OA\Post(
        path: '/cases/{case}/reopen',
        operationId: 'cases.reopen',
        tags: ['Cases'],
        summary: 'Reopen a closed case',
        description: 'Requires the `cases.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The reopened case', content: new OA\JsonContent(ref: '#/components/schemas/Case')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function reopen(): void {}
}
