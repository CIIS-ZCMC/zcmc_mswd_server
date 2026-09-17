<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\PatientCaretakerController,
 * PatientCaretakeController, UnassignCaretakerController and
 * ReassignCaretakerController.
 * Reads require `patients.view`; writes require `patients.update`.
 */
final class PatientCaretakerDocs
{
    #[OA\Get(
        path: '/patients/{patient}/caretakers',
        operationId: 'patients.caretakers.index',
        tags: ['Patient Records'],
        summary: 'List a patient\'s caretakers',
        description: 'Requires the `patients.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'patient', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Caretakers', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/PatientCaretaker')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function index(): void {}

    #[OA\Post(
        path: '/patients/{patient}/caretakers',
        operationId: 'patients.caretakers.store',
        tags: ['Patient Records'],
        summary: 'Assign a caretaker',
        description: 'Requires the `patients.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'patient', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/PatientCaretakerRequest')),
        responses: [
            new OA\Response(response: 201, description: 'The created caretaker', content: new OA\JsonContent(ref: '#/components/schemas/PatientCaretaker')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function store(): void {}

    #[OA\Get(
        path: '/patients/{patient}/caretake',
        operationId: 'patients.caretake',
        tags: ['Patient Records'],
        summary: 'The patient\'s current active caretaker',
        description: 'Requires the `patients.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'patient', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The active caretaker', content: new OA\JsonContent(ref: '#/components/schemas/PatientCaretaker')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function caretake(): void {}

    #[OA\Patch(
        path: '/caretakers/{caretaker}/unassign',
        operationId: 'caretakers.unassign',
        tags: ['Patient Records'],
        summary: 'Unassign a caretaker',
        description: 'Requires the `patients.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'caretaker', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The unassigned caretaker', content: new OA\JsonContent(ref: '#/components/schemas/PatientCaretaker')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function unassign(): void {}

    #[OA\Post(
        path: '/caretakers/{caretaker}/reassign',
        operationId: 'caretakers.reassign',
        tags: ['Patient Records'],
        summary: 'Reassign a caretaker to another user',
        description: 'Requires the `patients.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'caretaker', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/ReassignCaretakerRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The new caretaker assignment', content: new OA\JsonContent(ref: '#/components/schemas/PatientCaretaker')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function reassign(): void {}
}
