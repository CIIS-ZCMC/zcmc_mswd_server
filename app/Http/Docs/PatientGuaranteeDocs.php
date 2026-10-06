<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for the MSWD patient guarantors (PatientGuaranteeController) and the
 * assistance-source lookup (AssistanceSourceController). Not the HIS guarantor ledger.
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
        path: '/assistance-sources',
        operationId: 'assistanceSources.index',
        tags: ['Reference'],
        summary: 'List assistance sources',
        description: '`?active=1` hides retired sources.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'active', in: 'query', required: false, schema: new OA\Schema(type: 'boolean'))],
        responses: [
            new OA\Response(response: 200, description: 'Assistance sources', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/AssistanceSource')),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
        ],
    )]
    public function sources(): void {}

    #[OA\Get(
        path: '/assistance-sources/{assistanceSource}',
        operationId: 'assistanceSources.show',
        tags: ['Reference'],
        summary: 'Show an assistance source',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'assistanceSource', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'The assistance source', content: new OA\JsonContent(ref: '#/components/schemas/AssistanceSource')),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function source(): void {}

    #[OA\Post(
        path: '/assistance-sources',
        operationId: 'assistanceSources.store',
        tags: ['Patient Guarantors'],
        summary: 'Add a breakdown type',
        description: 'Requires the `guarantee.create` permission.',
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/AssistanceSourceRequest')),
        responses: [
            new OA\Response(response: 201, description: 'The created type', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/AssistanceSource'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function storeSource(): void {}

    #[OA\Put(
        path: '/assistance-sources/{assistanceSource}',
        operationId: 'assistanceSources.update',
        tags: ['Patient Guarantors'],
        summary: 'Rename, retire or reactivate a breakdown type',
        description: 'Partial update. Requires the `guarantee.create` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'assistanceSource', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        requestBody: new OA\RequestBody(required: true, content: new OA\JsonContent(ref: '#/components/schemas/AssistanceSourceRequest')),
        responses: [
            new OA\Response(response: 200, description: 'The updated type', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', ref: '#/components/schemas/AssistanceSource'),
            ])),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function updateSource(): void {}

    #[OA\Delete(
        path: '/assistance-sources/{assistanceSource}',
        operationId: 'assistanceSources.destroy',
        tags: ['Patient Guarantors'],
        summary: 'Delete a breakdown type (soft delete)',
        description: 'Lines that already use the type keep showing its name; new lines can no longer pick it. Requires the `guarantee.create` permission.',
        security: [['sanctum' => []]],
        parameters: [new OA\Parameter(name: 'assistanceSource', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 204, description: 'Deleted'),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
        ],
    )]
    public function destroySource(): void {}
}
