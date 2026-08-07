<?php

namespace App\Http\Controllers;

use App\DTOs\UnifiedIntakeSheetDto;
use App\Http\Requests\StoreUnifiedIntakeSheetRequest;
use App\Http\Requests\UpdateUnifiedIntakeSheetRequest;
use App\Http\Resources\ActivityResource;
use App\Http\Resources\PatientResource;
use App\Http\Resources\UnifiedIntakeSheetResource;
use App\Models\UnifiedIntakeSheet;
use App\Services\UnifiedIntakeSheetPdfService;
use App\Services\UnifiedIntakeSheetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class UnifiedIntakeSheetController extends Controller
{
    public function __construct(protected UnifiedIntakeSheetService $service) {}

    public function index(): AnonymousResourceCollection
    {
        return UnifiedIntakeSheetResource::collection($this->service->list());
    }

    public function store(StoreUnifiedIntakeSheetRequest $request): JsonResponse
    {
        $sheet = $this->service->createDraft(
            UnifiedIntakeSheetDto::fromArray($request->validated()),
            $request->user(),
        );

        return UnifiedIntakeSheetResource::make($sheet)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(UnifiedIntakeSheet $intakeSheet): UnifiedIntakeSheetResource
    {
        return UnifiedIntakeSheetResource::make(
            $intakeSheet->load('patient', 'case', 'assessment', 'intakeWorker'),
        );
    }

    public function update(UpdateUnifiedIntakeSheetRequest $request, UnifiedIntakeSheet $intakeSheet): UnifiedIntakeSheetResource
    {
        $sheet = $this->service->update($intakeSheet, UnifiedIntakeSheetDto::fromArray($request->validated()));

        return UnifiedIntakeSheetResource::make($sheet);
    }

    public function submit(UnifiedIntakeSheet $intakeSheet): UnifiedIntakeSheetResource
    {
        return UnifiedIntakeSheetResource::make($this->service->submit($intakeSheet));
    }

    public function finalize(Request $request, UnifiedIntakeSheet $intakeSheet): UnifiedIntakeSheetResource
    {
        return UnifiedIntakeSheetResource::make($this->service->finalize($intakeSheet, $request->user()));
    }

    public function destroy(UnifiedIntakeSheet $intakeSheet): Response
    {
        $this->service->cancel($intakeSheet);

        return response()->noContent();
    }

    public function history(UnifiedIntakeSheet $intakeSheet): AnonymousResourceCollection
    {
        return ActivityResource::collection($this->service->history($intakeSheet));
    }

    public function pdf(Request $request, UnifiedIntakeSheet $intakeSheet, UnifiedIntakeSheetPdfService $pdfService): Response
    {
        $pdf = $pdfService->render($intakeSheet);
        $filename = $pdfService->filename($intakeSheet);

        return $request->boolean('download')
            ? $pdf->download($filename)
            : $pdf->stream($filename);
    }

    public function matchPatients(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'last_name' => ['required', 'string'],
            'first_name' => ['required', 'string'],
            'birthdate' => ['nullable', 'date'],
        ]);

        return PatientResource::collection($this->service->matchPatients(
            $validated['last_name'],
            $validated['first_name'],
            $validated['birthdate'] ?? null,
        ));
    }
}
