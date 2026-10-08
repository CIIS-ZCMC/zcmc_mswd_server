<?php

namespace App\Services;

use App\Models\DarEntry;
use App\Models\Patient;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * A worker's Daily Accomplishment Report: their own DAR lines for one day, as a list,
 * a PDF with a Prepared-by block, or a CSV. See docs/DAR_PLAN.md.
 */
class DarReportService
{
    /**
     * @return Collection<int, DarEntry>
     */
    public function entriesFor(User $user, Carbon $date): Collection
    {
        // A patient merged away or deleted after the line was written still prints.
        return DarEntry::query()
            ->forUserOn($user, $date)
            ->with(['patient' => fn ($query) => $query->withTrashed()])
            ->get();
    }

    /**
     * The day's totals: distinct patients served, lines, and lines per activity (in
     * the ACTIVITIES order, only those used).
     *
     * @param  Collection<int, DarEntry>  $entries
     * @return array{patients_served: int, entries: int, by_activity: array<string, int>}
     */
    public function summary(Collection $entries): array
    {
        $counts = $entries->countBy('activity');

        return [
            'patients_served' => $entries->pluck('patient_id')->unique()->count(),
            'entries' => $entries->count(),
            'by_activity' => collect(DarEntry::ACTIVITIES)
                ->filter(fn ($label, $key) => $counts->has($key))
                ->mapWithKeys(fn ($label, $key) => [$label => $counts[$key]])
                ->all(),
        ];
    }

    /**
     * The patient as a DAR line shows them, with the age as of the day served.
     *
     * @return array{id: int, name: string, hospital_id: int|string|null, mswd_id: string|null, age: int|null, sex: string|null, address: string|null}
     */
    public function patient(Patient $patient, ?Carbon $on = null): array
    {
        $on ??= now();

        $address = filled($patient->permanent_address)
            ? $patient->permanent_address
            : collect([$patient->address, $patient->barangay, $patient->municipality, $patient->province])->filter()->join(', ');

        return [
            'id' => $patient->id,
            'name' => collect([$patient->last_name.',', $patient->first_name, $patient->middle_name, $patient->extension_name])
                ->filter(fn ($part) => filled(rtrim((string) $part, ',')))->join(' '),
            'hospital_id' => $patient->hospital_id,
            'mswd_id' => $patient->mswd_id,
            'age' => $patient->birthdate
                ? (int) Carbon::parse($patient->birthdate)->diffInYears($on)
                : $patient->estimated_age,
            'sex' => $patient->sex,
            'address' => filled($address) ? $address : null,
        ];
    }

    public function renderPdf(User $user, Carbon $date): DomPdf
    {
        $entries = $this->entriesFor($user, $date);

        return Pdf::loadView('pdf.dar', [
            'date' => $date,
            'worker' => $user,
            'lines' => $this->lines($entries, $date),
            'summary' => $this->summary($entries),
        ])->setPaper('a4', 'portrait');
    }

    /**
     * @return array{headers: list<string>, rows: list<list<string|int|null>>}
     */
    public function toRows(User $user, Carbon $date): array
    {
        return [
            'headers' => ['#', 'Date', 'Time', 'Patient', 'Hospital No.', 'MSWD ID', 'Age', 'Sex', 'Address', 'Activity', 'Remarks'],
            'rows' => collect($this->lines($this->entriesFor($user, $date), $date))
                ->map(fn (array $line) => [
                    $line['no'], $date->toDateString(), $line['time'], $line['patient']['name'],
                    $line['patient']['hospital_id'], $line['patient']['mswd_id'], $line['patient']['age'],
                    $line['patient']['sex'], $line['patient']['address'], $line['activity'], $line['remarks'],
                ])->all(),
        ];
    }

    public function filename(User $user, Carbon $date, string $extension): string
    {
        $who = Str::slug((string) ($user->employee_name ?: $user->id));

        return "DAR_{$who}_{$date->toDateString()}.{$extension}";
    }

    /**
     * The numbered, formatted lines the PDF and CSV print.
     *
     * @param  Collection<int, DarEntry>  $entries
     * @return list<array{no: int, time: string|null, patient: array<string, mixed>, activity: string, remarks: string|null}>
     */
    private function lines(Collection $entries, Carbon $date): array
    {
        return $entries->values()->map(fn (DarEntry $entry, int $index) => [
            'no' => $index + 1,
            'time' => $entry->served_time === null ? null : Carbon::parse($entry->served_time)->format('g:i A'),
            'patient' => $entry->patient === null
                ? ['name' => '—', 'hospital_id' => null, 'mswd_id' => null, 'age' => null, 'sex' => null, 'address' => null]
                : $this->patient($entry->patient, $date),
            'activity' => $entry->activityLabel(),
            'remarks' => $entry->remarks,
        ])->all();
    }
}
