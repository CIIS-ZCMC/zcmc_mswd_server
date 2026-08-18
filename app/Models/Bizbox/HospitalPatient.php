<?php

namespace App\Models\Bizbox;

use Illuminate\Database\Eloquent\Model;

/**
 * Read-only view of a patient record living in the hospital's SQL Server
 * database (the HIS). This app never writes to it — only `get` and `find`.
 *
 * Adjust $table, $primaryKey and the Resource mapping to match the actual
 * HIS schema; the defaults below are placeholders.
 */
class HospitalPatient extends Model
{
    /**
     * Resolve against the SQL Server connection defined in config/database.php.
     */
    protected $connection = 'sqlsrv';

    protected $table = 'emdPatients';

    protected $primaryKey = 'PK_emdPatients';

    /**
     * The HIS table is not managed by this app's migrations.
     */
    public $timestamps = false;

    /**
     * Guard every attribute — this model is read-only.
     *
     * @var list<string>
     */
    protected $guarded = ['*'];

    public function personalData()
    {
        return $this->hasOne(PatientPersonalData::class, 'PK_psPersonalData');
    }

    /**
     * The hospital number the wards and the HIS UI use (emdPatients.patid).
     */
    public function getHospitalNumberAttribute(): ?string
    {
        return $this->patid !== null ? (string) $this->patid : null;
    }

    /**
     * "LASTNAME, FIRSTNAME MIDDLENAME" — blank parts are dropped.
     */
    public function displayName(): string
    {
        $data = $this->personalData;

        $given = trim(implode(' ', array_filter([$data?->firstname, $data?->middlename])));
        $last = trim((string) $data?->lastname);

        return trim(implode(', ', array_filter([$last, $given]))) ?: 'Unnamed patient';
    }

    /**
     * Map the HIS record onto this app's `patients` columns. Single place where
     * the Bizbox schema is translated, so callers never touch raw HIS columns.
     *
     * @return array<string, mixed>
     */
    public function toPatientAttributes(): array
    {
        $data = $this->personalData;

        return array_filter([
            'hospital_id' => $this->patid,
            'first_name' => $this->clean($data?->firstname),
            'last_name' => $this->clean($data?->lastname),
            'middle_name' => $this->clean($data?->middlename),
            'extension_name' => $this->clean($data?->suffixname),
            'sex' => match (strtolower(trim((string) $data?->gender))) {
                'male' => 'male',
                'female' => 'female',
                default => null,
            },
            'birthdate' => $data?->birthdate
                ? substr((string) $data->birthdate, 0, 10)
                : null,
            'civil_status' => static::CIVIL_STATUSES[strtoupper(trim((string) $data?->civilstatus))] ?? null,
        ], fn ($value) => filled($value));
    }

    /**
     * HIS civil-status codes. Unknown codes are dropped rather than guessed.
     */
    private const CIVIL_STATUSES = [
        'S' => 'Single',
        'M' => 'Married',
        'W' => 'Widowed',
        'D' => 'Divorced',
        'A' => 'Annulled',
        'L' => 'Legally separated',
        'CO' => 'Common law',
    ];

    private function clean(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }
}
