<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePatientDocumentRequest;
use App\Http\Resources\DocumentResource;
use App\Models\CaseModel;
use App\Models\Document;
use App\Models\DocumentType;
use App\Models\Patient;
use App\Services\DocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class DocumentController extends Controller
{
    public function __construct(protected DocumentService $service) {}

    /** A patient's documents, newest first; `?document_type_id=` and `?case_id=` narrow the list. */
    public function index(Request $request, Patient $patient): AnonymousResourceCollection
    {
        $documents = $patient->documents()
            ->with(['uploadedBy', 'case', 'documentType'])
            ->when($request->integer('document_type_id'), fn ($query, $id) => $query->where('document_type_id', $id))
            ->when($request->integer('case_id'), fn ($query, $id) => $query->where('case_id', $id))
            ->latest()
            ->get();

        return DocumentResource::collection($documents);
    }

    /**
     * Upload a document for the patient, optionally tied to one of their cases.
     */
    public function store(StorePatientDocumentRequest $request, Patient $patient): JsonResponse
    {
        $case = $request->validated('case_id')
            ? CaseModel::findOrFail($request->validated('case_id'))
            : null;

        $document = $this->service->upload(
            $patient,
            $case,
            $request->file('file'),
            DocumentType::findOrFail($request->validated('document_type_id')),
            $request->user(),
        );

        return DocumentResource::make($document->load(['uploadedBy', 'case', 'documentType']))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function destroy(Patient $patient, Document $document): Response
    {
        abort_unless($document->patient_id === $patient->id, Response::HTTP_NOT_FOUND);

        $this->service->delete($document);

        return response()->noContent();
    }
}
