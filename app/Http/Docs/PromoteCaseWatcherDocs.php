<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\PromoteCaseWatcherController. Requires `cases.update`. */
final class PromoteCaseWatcherDocs
{
    #[OA\Post(
        path: '/case-watchers/{caseWatcher}/promote',
        operationId: 'case-watchers.promote',
        tags: ['Cases'],
        summary: 'Promote a case watcher to primary',
        description: 'Requires the `cases.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'caseWatcher', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The promoted case watcher', content: new OA\JsonContent(ref: '#/components/schemas/CaseWatcher')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function promote(): void {}
}
