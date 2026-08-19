<?php

namespace App\Http\Controllers;

use App\DTOs\DocumentDto;
use App\Http\Requests\StoreCaseDocumentRequest;
use App\Http\Resources\DocumentResource;
use App\Models\CaseModel;
use App\Models\Document;
use App\Services\DocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class CaseDocumentController extends Controller implements HasMiddleware
{
    public function __construct(protected DocumentService $service) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:cases.view', only: ['index']),
            new Middleware('permission:cases.update', only: ['store', 'destroy']),
        ];
    }

    public function index(CaseModel $case): AnonymousResourceCollection
    {
        return DocumentResource::collection($case->documents()->latest()->get());
    }

    public function store(StoreCaseDocumentRequest $request, CaseModel $case): JsonResponse
    {
        $file = $request->file('file');
        $path = $file->store("cases/{$case->id}/documents");

        $document = $this->service->create(DocumentDto::fromArray([
            'case_id' => $case->id,
            'patient_id' => $case->patient_id,
            'uploaded_by' => $request->user()->id,
            'document_type' => $request->validated('document_type'),
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'file_type' => $file->getClientMimeType(),
        ]));

        return DocumentResource::make($document)->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function destroy(CaseModel $case, Document $document): Response
    {
        abort_unless($document->case_id === $case->id, Response::HTTP_NOT_FOUND);

        $this->service->delete($document);

        return response()->noContent();
    }
}
