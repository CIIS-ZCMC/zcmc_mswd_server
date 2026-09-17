<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\PatientWatcherController.
 * Reads require `patients.view`; writes require `patients.update`.
 */
final class PatientWatcherDocs
{
    #[OA\Get(
        path: '/patients/{patient}/watchers',
        operationId: 'patients.watchers.index',
        tags: ['Patient Records'],
        summary: 'List a patient\'s watchers',
        description: 'Requires the `patients.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'patient', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Watchers', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/PatientWatcher')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function index(): void {}

    #[OA\Post(
        path: '/patients/{patient}/watchers',
        operationId: 'patients.watchers.store',
        tags: ['Patient Records'],
        summary: 'Add a watcher',
        description: 'Requires the `patients.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'patient', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/PatientWatcherRequest')),
        responses: [
            new OA\Response(response: 201, description: 'The created watcher', content: new OA\JsonContent(ref: '#/components/schemas/PatientWatcher')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function store(): void {}

    #[OA\Put(
        path: '/watchers/{watcher}',
        operationId: 'watchers.update',
        tags: ['Patient Records'],
        summary: 'Update a watcher',
        description: 'Requires the `patients.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'watcher', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/PatientWatcherRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The updated watcher', content: new OA\JsonContent(ref: '#/components/schemas/PatientWatcher')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function update(): void {}

    #[OA\Delete(
        path: '/watchers/{watcher}',
        operationId: 'watchers.destroy',
        tags: ['Patient Records'],
        summary: 'Delete a watcher',
        description: 'Requires the `patients.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'watcher', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 204, ref: '#/components/responses/NoContent'),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function destroy(): void {}
}
