<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for the MSWD patient guarantors (PatientGuaranteeController). Not the HIS guarantor ledger.
 */
final class PatientGuaranteeDocs
{
    #[OA\Get(
        path: '/patients/{patient}/guarantees',
        operationId: 'patients.guarantees.index',
        tags: ['Patient Guarantors'],
        summary: 'The patient\'s guarantors, optionally for one hospital encounter',
        description: 'Newest first. `?transaction={his_transaction_id}` narrows to one encounter. `grand_total` sums every listed guarantee\'s total. Requires the `guarantee.view` permission.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'patient', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'transaction', in: 'query', required: false, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'The guarantees', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/PatientGuarantee')),
                new OA\Property(property: 'grand_total', type: 'number', format: 'float'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function index(): void {}

    #[OA\Post(
        path: '/patients/{patient}/guarantees',
        operationId: 'patients.guarantees.store',
        tags: ['Patient Guarantors'],
        summary: 'Record a guarantor on a hospital encounter, with its breakdown',
        description: 'The encounter must belong to the patient\'s hospital record (422 otherwise). The total is the sum of `items` and is never accepted from the body. A source with `requires_specify` needs `others_specify`. Requires the `guarantee.create` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'patient', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/PatientGuaranteeRequest')),
        responses: [
            new OA\Response(response: 201, description: 'The created guarantee', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/PatientGuarantee'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function store(): void {}

    #[OA\Get(
        path: '/guarantees/{guarantee}',
        operationId: 'guarantees.show',
        tags: ['Patient Guarantors'],
        summary: 'One guarantee with its breakdown',
        description: 'Requires the `guarantee.view` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'guarantee', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The guarantee', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/PatientGuarantee'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function show(): void {}

    #[OA\Put(
        path: '/guarantees/{guarantee}',
        operationId: 'guarantees.update',
        tags: ['Patient Guarantors'],
        summary: 'Correct a guarantee',
        description: 'Partial update of the header. When `items` is sent it replaces the whole breakdown. `his_transaction_id` cannot be changed. Requires the `guarantee.update` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'guarantee', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/PatientGuaranteeRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The updated guarantee', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/PatientGuarantee'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function update(): void {}

    #[OA\Delete(
        path: '/guarantees/{guarantee}',
        operationId: 'guarantees.destroy',
        tags: ['Patient Guarantors'],
        summary: 'Delete a guarantee (soft delete)',
        description: 'Requires the `guarantee.delete` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'guarantee', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 204, description: 'Deleted'),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function destroy(): void {}

    #[OA\Get(
        path: '/guarantees/pending-approval',
        operationId: 'guarantees.pending-approval',
        tags: ['Patient Guarantors'],
        summary: 'Guarantees waiting for approval',
        description: 'Guarantees at or above the approval threshold that no one has signed off yet, oldest first. Requires the `guarantee.approve` permission.',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'The waiting guarantees', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(properties: [
                    new OA\Property(property: 'id', type: 'integer'),
                    new OA\Property(property: 'patient', properties: [
                        new OA\Property(property: 'id', type: 'integer'),
                        new OA\Property(property: 'name', type: 'string'),
                        new OA\Property(property: 'hospital_id', type: 'integer', nullable: true),
                    ], type: 'object', nullable: true),
                    new OA\Property(property: 'his_transaction_id', type: 'integer'),
                    new OA\Property(property: 'guarantor', type: 'string', nullable: true),
                    new OA\Property(property: 'reference_no', type: 'string', nullable: true),
                    new OA\Property(property: 'guaranteed_on', type: 'string', format: 'date'),
                    new OA\Property(property: 'total', type: 'number', format: 'float'),
                    new OA\Property(property: 'recorded_by', type: 'string', nullable: true),
                    new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
                ], type: 'object')),
                new OA\Property(property: 'count', type: 'integer'),
                new OA\Property(property: 'threshold', type: 'number', format: 'float'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
        ],
    )]
    public function pendingApproval(): void {}

    #[OA\Post(
        path: '/guarantees/{guarantee}/approve',
        operationId: 'guarantees.approve',
        tags: ['Patient Guarantors'],
        summary: 'Approve a guarantee',
        description: 'Signs off a guarantee that is `pending` (422 otherwise). Requires the `guarantee.approve` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'guarantee', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The approved guarantee', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/PatientGuarantee'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function approve(): void {}

    #[OA\Get(
        path: '/dashboard/guarantee-totals',
        operationId: 'dashboard.guarantee-totals',
        tags: ['Patient Guarantors'],
        summary: 'Guarantee amounts per day and guarantor',
        description: 'For the dashboard Assistance released card. Counts guarantees by `guaranteed_on`, once they need no approval or have it. Patients with a protective case are left out without `audit.view_protective`. The last 7 days by default. Requires the `guarantee.view` permission.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'from', in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'date')),
            new OA\Parameter(name: 'to', in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'date')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Totals per day', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', properties: [
                    new OA\Property(property: 'from', type: 'string', format: 'date'),
                    new OA\Property(property: 'to', type: 'string', format: 'date'),
                    new OA\Property(property: 'protective_excluded', type: 'boolean'),
                    new OA\Property(property: 'total', type: 'number', format: 'float'),
                    new OA\Property(property: 'days', type: 'array', items: new OA\Items(properties: [
                        new OA\Property(property: 'date', type: 'string', format: 'date'),
                        new OA\Property(property: 'total', type: 'number', format: 'float'),
                        new OA\Property(property: 'by_guarantor', type: 'object', additionalProperties: new OA\AdditionalProperties(type: 'number', format: 'float')),
                    ], type: 'object')),
                ], type: 'object'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function guaranteeTotals(): void {}
}
