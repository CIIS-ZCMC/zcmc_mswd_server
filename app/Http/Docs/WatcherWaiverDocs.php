<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\StoreWatcherWaiverController and
 * DestroyWatcherWaiverController. Both require the `cases.waive_watcher` permission.
 */
final class WatcherWaiverDocs
{
    #[OA\Post(
        path: '/cases/{case}/watcher-waiver',
        operationId: 'cases.watcher-waiver.store',
        tags: ['Cases'],
        summary: 'File a watcher waiver',
        description: 'Requires the `cases.waive_watcher` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/WatcherWaiverRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The case with the waiver applied', content: new OA\JsonContent(ref: '#/components/schemas/Case')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function store(): void {}

    #[OA\Delete(
        path: '/cases/{case}/watcher-waiver',
        operationId: 'cases.watcher-waiver.destroy',
        tags: ['Cases'],
        summary: 'Lift a watcher waiver',
        description: 'Requires the `cases.waive_watcher` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The case with the waiver lifted', content: new OA\JsonContent(ref: '#/components/schemas/Case')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function destroy(): void {}
}
