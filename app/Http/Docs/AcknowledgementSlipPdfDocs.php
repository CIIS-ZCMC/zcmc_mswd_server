<?php

namespace App\Http\Docs;

use OpenApi\Attributes as OA;

/**
 * OpenAPI docs for App\Http\Controllers\GuaranteeAcknowledgementSlipPdfController.
 * Requires `guarantee.view`.
 */
final class AcknowledgementSlipPdfDocs
{
    #[OA\Get(
        path: '/guarantees/{guarantee}/acknowledgement-slip/pdf',
        operationId: 'guarantees.acknowledgement-slip',
        tags: ['Guarantees'],
        summary: 'Print the DOH-MAIFIP Acknowledgement Slip (ZCMC-F-MSWD-46)',
        description: 'MAIFIP guarantees only (422 `not_maifip` otherwise). Records a print-history row unless `preview=1`. The times print on the slip and are not stored. Requires the `guarantee.view` permission.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'guarantee', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'preview', in: 'query', required: false, schema: new OA\Schema(type: 'boolean')),
            new OA\Parameter(name: 'download', in: 'query', required: false, schema: new OA\Schema(type: 'boolean')),
            new OA\Parameter(name: 'copies', in: 'query', required: false, schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 20)),
            new OA\Parameter(name: 'remarks', in: 'query', required: false, schema: new OA\Schema(type: 'string', maxLength: 255)),
            new OA\Parameter(name: 'time_started', in: 'query', required: false, schema: new OA\Schema(type: 'string', example: '10:49')),
            new OA\Parameter(name: 'time_ended', in: 'query', required: false, schema: new OA\Schema(type: 'string', example: '10:55')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'The slip PDF', content: new OA\MediaType(
                mediaType: 'application/pdf',
                schema: new OA\Schema(type: 'string', format: 'binary'),
            )),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
        ],
    )]
    public function pdf(): void {}

    #[OA\Get(
        path: '/patient-transactions/{id}/city-mayor-slip/pdf',
        operationId: 'patient-transactions.city-mayor-slip',
        tags: ['Guarantees'],
        summary: 'Print the City Mayor Acknowledgement Slip (ZCMC-F-MSS-04)',
        description: 'Per HIS encounter. The fund, amount and type of assistance are picked by the caller and printed only. Logged unless `preview=1`. 503 `his_unreachable` when the HIS is down. Requires the `guarantee.view` permission.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'fund', in: 'query', required: false, schema: new OA\Schema(type: 'string', enum: ['city_grant', 'dswd', 'pcso', 'armm', 'others'])),
            new OA\Parameter(name: 'fund_other', in: 'query', required: false, description: 'Required when fund=others.', schema: new OA\Schema(type: 'string', maxLength: 100)),
            new OA\Parameter(name: 'amount', in: 'query', required: false, schema: new OA\Schema(type: 'number', minimum: 0)),
            new OA\Parameter(name: 'assistant_type_ids', in: 'query', required: false, description: 'The "Para sa" ticks: Types of Assistance ids, comma-separated (e.g. 3,4).', schema: new OA\Schema(type: 'string', example: '3,4')),
            new OA\Parameter(name: 'time_started', in: 'query', required: false, schema: new OA\Schema(type: 'string', example: '17:20')),
            new OA\Parameter(name: 'time_ended', in: 'query', required: false, schema: new OA\Schema(type: 'string', example: '17:28')),
            new OA\Parameter(name: 'remarks', in: 'query', required: false, schema: new OA\Schema(type: 'string', maxLength: 255)),
            new OA\Parameter(name: 'preview', in: 'query', required: false, schema: new OA\Schema(type: 'boolean')),
            new OA\Parameter(name: 'download', in: 'query', required: false, schema: new OA\Schema(type: 'boolean')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'The slip PDF', content: new OA\MediaType(
                mediaType: 'application/pdf',
                schema: new OA\Schema(type: 'string', format: 'binary'),
            )),
            new OA\Response(response: 401, ref: '#/components/responses/Unauthenticated'),
            new OA\Response(response: 403, ref: '#/components/responses/Forbidden'),
            new OA\Response(response: 404, ref: '#/components/responses/NotFound'),
            new OA\Response(response: 422, ref: '#/components/responses/ValidationError'),
            new OA\Response(response: 503, description: 'The HIS is unreachable'),
        ],
    )]
    public function cityMayorPdf(): void {}
}
