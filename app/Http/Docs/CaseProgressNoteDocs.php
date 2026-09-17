<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\CaseProgressNoteController and
 * CompleteFollowUpController. Writes require `cases.update`.
 */
final class CaseProgressNoteDocs
{
    #[OA\Get(
        path: '/cases/{case}/progress-notes',
        operationId: 'cases.progress-notes.index',
        tags: ['Case Clinical'],
        summary: 'List a case\'s progress notes',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Progress notes', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/CaseProgressNote')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function index(): void {}

    #[OA\Post(
        path: '/cases/{case}/progress-notes',
        operationId: 'cases.progress-notes.store',
        tags: ['Case Clinical'],
        summary: 'Add a progress note',
        description: 'Requires the `cases.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'case', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/CaseProgressNoteRequest')),
        responses: [
            new OA\Response(response: 201, description: 'The created progress note', content: new OA\JsonContent(ref: '#/components/schemas/CaseProgressNote')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function store(): void {}

    #[OA\Put(
        path: '/progress-notes/{progressNote}',
        operationId: 'progress-notes.update',
        tags: ['Case Clinical'],
        summary: 'Update a progress note',
        description: 'Requires the `cases.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'progressNote', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/CaseProgressNoteRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The updated progress note', content: new OA\JsonContent(ref: '#/components/schemas/CaseProgressNote')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function update(): void {}

    #[OA\Delete(
        path: '/progress-notes/{progressNote}',
        operationId: 'progress-notes.destroy',
        tags: ['Case Clinical'],
        summary: 'Delete a progress note',
        description: 'Requires the `cases.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'progressNote', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 204, ref: '#/components/responses/NoContent'),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function destroy(): void {}

    #[OA\Post(
        path: '/progress-notes/{progressNote}/complete-follow-up',
        operationId: 'progress-notes.complete-follow-up',
        tags: ['Case Clinical'],
        summary: 'Mark a progress note\'s follow-up done',
        description: 'Requires the `cases.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'progressNote', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The progress note', content: new OA\JsonContent(ref: '#/components/schemas/CaseProgressNote')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function completeFollowUp(): void {}
}
