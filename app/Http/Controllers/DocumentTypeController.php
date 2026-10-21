<?php

namespace App\Http\Controllers;

use App\Http\Requests\DocumentTypeRequest;
use App\Http\Resources\DocumentTypeResource;
use App\Models\DocumentType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * The kinds of patient document, for the upload dropdown. Reads are open to any
 * signed-in user; `library.manage` edits the list. Unpaginated, like the other lookups.
 */
class DocumentTypeController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:library.manage', only: ['store', 'update', 'destroy']),
        ];
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $items = DocumentType::query()
            // `?active=1` hides retired types from the upload dropdown while leaving
            // them resolvable on the documents already filed under them.
            ->when($request->boolean('active'), fn ($query) => $query->where('is_active', true))
            ->withCount('documents')
            ->ordered()
            ->get();

        return DocumentTypeResource::collection($items);
    }

    public function show(DocumentType $documentType): DocumentTypeResource
    {
        return $this->present($documentType);
    }

    public function store(DocumentTypeRequest $request): JsonResponse
    {
        $type = DocumentType::create($request->validated());

        return $this->present($type)->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(DocumentTypeRequest $request, DocumentType $documentType): DocumentTypeResource
    {
        $documentType->update($request->validated());

        return $this->present($documentType);
    }

    /** Soft delete: uploaded documents keep the type name; new uploads can no longer pick it. */
    public function destroy(DocumentType $documentType): Response
    {
        $documentType->delete();

        return response()->noContent();
    }

    private function present(DocumentType $type): DocumentTypeResource
    {
        return DocumentTypeResource::make(DocumentType::withCount('documents')->findOrFail($type->getKey()));
    }
}
