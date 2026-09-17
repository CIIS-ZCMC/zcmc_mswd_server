<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\ReassessCaseController. Requires `cases.create`. */
final class ReassessCaseDocs
{
    #[OA\Post(
        path: '/cases/{case}/reassess',
        operationId: 'cases.reassess',
        tags: ['Case Clinical'],
        summary: 'Open a reassessment for a case',
        description: 'Requires the `cases.create` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: false, content: new OA\JsonContent(ref: '#/components/schemas/AssessmentRequest')),
        responses: [
            new OA\Response(response: 201, description: 'The new assessment', content: new OA\JsonContent(ref: '#/components/schemas/Assessment')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function reassess(): void {}
}
