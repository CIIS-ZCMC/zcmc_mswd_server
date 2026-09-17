<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\PatientFamilyMemberController.
 * Reads require `patients.view`; writes require `patients.update`.
 */
final class PatientFamilyMemberDocs
{
    #[OA\Get(
        path: '/patients/{patient}/family-members',
        operationId: 'patients.family-members.index',
        tags: ['Patient Records'],
        summary: 'List a patient\'s family members',
        description: 'Requires the `patients.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'patient', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Family members', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/PatientFamilyMember')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function index(): void {}

    #[OA\Post(
        path: '/patients/{patient}/family-members',
        operationId: 'patients.family-members.store',
        tags: ['Patient Records'],
        summary: 'Add a family member',
        description: 'Requires the `patients.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'patient', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/PatientFamilyMemberRequest')),
        responses: [
            new OA\Response(response: 201, description: 'The created family member', content: new OA\JsonContent(ref: '#/components/schemas/PatientFamilyMember')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function store(): void {}

    #[OA\Put(
        path: '/family-members/{familyMember}',
        operationId: 'family-members.update',
        tags: ['Patient Records'],
        summary: 'Update a family member',
        description: 'Requires the `patients.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'familyMember', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/PatientFamilyMemberRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The updated family member', content: new OA\JsonContent(ref: '#/components/schemas/PatientFamilyMember')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function update(): void {}

    #[OA\Delete(
        path: '/family-members/{familyMember}',
        operationId: 'family-members.destroy',
        tags: ['Patient Records'],
        summary: 'Delete a family member',
        description: 'Requires the `patients.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'familyMember', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 204, ref: '#/components/responses/NoContent'),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function destroy(): void {}
}
