<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\AssignCaseController. Requires `cases.update`. */
final class AssignCaseDocs
{
    #[OA\Post(
        path: '/cases/{case}/assign',
        operationId: 'cases.assign',
        tags: ['Cases'],
        summary: 'Assign a case to a worker',
        description: 'Requires the `cases.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/AssignCaseRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The updated case', content: new OA\JsonContent(ref: '#/components/schemas/Case')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function assign(): void {}
}
