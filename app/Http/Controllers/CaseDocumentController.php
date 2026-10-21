<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCaseDocumentRequest;
use App\Http\Resources\DocumentResource;
use App\Models\CaseModel;
use App\Models\Document;
use App\Models\DocumentType;
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
        return DocumentResource::collection($case->documents()->with(['uploadedBy', 'case', 'documentType'])->latest()->get());
    }

    public function store(StoreCaseDocumentRequest $request, CaseModel $case): JsonResponse
    {
        $document = $this->service->upload(
            $case->patient,
            $case,
            $request->file('file'),
            DocumentType::findOrFail($request->validated('document_type_id')),
            $request->user(),
        );

        return DocumentResource::make($document->load(['uploadedBy', 'case', 'documentType']))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function destroy(CaseModel $case, Document $document): Response
    {
        abort_unless($document->case_id === $case->id, Response::HTTP_NOT_FOUND);

        $this->service->delete($document);

        return response()->noContent();
    }
}
