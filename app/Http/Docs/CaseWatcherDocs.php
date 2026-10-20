<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\CaseWatcherController.
 * Read requires `cases.view`; writes require `cases.update`.
 */
final class CaseWatcherDocs
{
    #[OA\Get(
        path: '/cases/{case}/watchers',
        operationId: 'cases.watchers.index',
        tags: ['Cases'],
        summary: 'List a case\'s watchers',
        description: 'Requires the `cases.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Case watchers', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/CaseWatcher')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function index(): void {}

    #[OA\Post(
        path: '/cases/{case}/watchers',
        operationId: 'cases.watchers.store',
        tags: ['Cases'],
        summary: 'Assign a watcher to a case',
        description: "Requires the `cases.update` permission. The case must be open or ongoing; 422 for another patient's watcher or one already assigned.",
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/CaseWatcherStoreRequest')),
        responses: [
            new OA\Response(response: 201, description: 'The created case watcher', content: new OA\JsonContent(ref: '#/components/schemas/CaseWatcher')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function store(): void {}

    #[OA\Put(
        path: '/case-watchers/{caseWatcher}',
        operationId: 'case-watchers.update',
        tags: ['Cases'],
        summary: 'Update a case watcher assignment',
        description: 'Requires the `cases.update` permission. Assignment fields only; edit the person with PUT /watchers/{watcher}. Promotion to primary is done via the promote endpoint.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'caseWatcher', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/CaseWatcherUpdateRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The updated case watcher', content: new OA\JsonContent(ref: '#/components/schemas/CaseWatcher')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function update(): void {}

    #[OA\Delete(
        path: '/case-watchers/{caseWatcher}',
        operationId: 'case-watchers.destroy',
        tags: ['Cases'],
        summary: 'Unassign a watcher from a case',
        description: "Requires the `cases.update` permission. Removes the assignment only; the patient's watcher stays. Refused for the last required primary watcher and on closed cases.",
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'caseWatcher', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 204, ref: '#/components/responses/NoContent'),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function destroy(): void {}
}
