<?php

namespace App\Http\Controllers;

use App\DTOs\DocumentDto;
use App\Http\Resources\DocumentResource;
use App\Models\Document;
use App\Models\Patient;
use App\Services\DocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class DocumentController extends Controller
{
    public function __construct(protected DocumentService $service) {}

    public function index(Patient $patient): AnonymousResourceCollection
    {
        return DocumentResource::collection($patient->documents()->latest()->get());
    }

    /**
     * Upload a document for the patient. A document is tied to one of the
     * patient's cases (the schema requires both patient and case).
     */
    public function store(Request $request, Patient $patient): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'max:10240'],
            'document_type' => ['required', 'string', 'max:255'],
            'case_id' => [
                'required',
                Rule::exists('cases', 'id')->where('patient_id', $patient->id),
            ],
        ]);

        $file = $request->file('file');
        $path = $file->store("patients/{$patient->id}/documents");

        $document = $this->service->create(DocumentDto::fromArray([
            'patient_id' => $patient->id,
            'case_id' => $validated['case_id'],
            'uploaded_by' => $request->user()->id,
            'document_type' => $validated['document_type'],
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'file_type' => $file->getClientMimeType(),
        ]));

        return DocumentResource::make($document)->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function destroy(Document $document): Response
    {
        $this->service->delete($document);

        return response()->noContent();
    }
}
