<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Serves a stored document through the app, so the bucket stays private and the
 * permission check runs on every read. Inline by default; `?download=1` saves it.
 */
class DocumentFileController extends Controller
{
    public function __invoke(Request $request, Patient $patient, Document $document): StreamedResponse
    {
        abort_unless($document->patient_id === $patient->id, Response::HTTP_NOT_FOUND);

        $disk = Storage::disk($document->storageDisk());

        abort_unless($disk->exists($document->file_path), Response::HTTP_NOT_FOUND);

        return $disk->response(
            $document->file_path,
            $document->file_name,
            ['Content-Type' => $document->file_type ?: 'application/octet-stream'],
            $request->boolean('download') ? 'attachment' : 'inline',
        );
    }
}
