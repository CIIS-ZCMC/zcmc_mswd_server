<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\RevokeWatcherPassController. Requires `cases.update`. */
final class RevokeWatcherPassDocs
{
    #[OA\Post(
        path: '/case-watchers/{caseWatcher}/revoke-pass',
        operationId: 'case-watchers.revoke-pass',
        tags: ['Cases'],
        summary: 'Revoke a watcher pass',
        description: 'Requires the `cases.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'caseWatcher', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The case watcher with the pass revoked', content: new OA\JsonContent(ref: '#/components/schemas/CaseWatcher')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function revokePass(): void {}
}
