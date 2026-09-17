<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/** OpenAPI docs for App\Http\Controllers\CaseWatcherStatusController. Requires `cases.view`. */
final class CaseWatcherStatusDocs
{
    #[OA\Get(
        path: '/cases/{case}/watcher-status',
        operationId: 'cases.watcher-status',
        tags: ['Cases'],
        summary: 'The case\'s watcher-requirement status',
        description: 'A lightweight fetch of the same watcher_status shape as the case profile. Requires the `cases.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Watcher status', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/WatcherStatus'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function status(): void {}
}
