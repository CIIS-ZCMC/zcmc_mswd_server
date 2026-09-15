<?php

namespace App\Models\Bizbox;

use Illuminate\Database\Eloquent\Model;

/**
 * Read-only view of Bizbox's entity master (psDataCenter). Both emdPatients and
 * psPersonaldata share this table's primary key, so the relations below are
 * shared-key hasOnes rather than ordinary foreign-key lookups.
 */
class DataCenter extends Model
{
    protected $connection = 'sqlsrv';

    protected $table = 'psDataCenter';

    protected $primaryKey = 'PK_psDatacenter';

    public $timestamps = false;

    /**
     * Guard every attribute — this model is read-only.
     *
     * @var list<string>
     */
    protected $guarded = ['*'];

    public function patient()
    {
        return $this->hasOne(HospitalPatient::class, 'PK_emdPatients', 'PK_psDatacenter');
    }

    public function personalData()
    {
        return $this->hasOne(PatientPersonalData::class, 'PK_psPersonalData', 'PK_psDatacenter');
    }

    /**
     * "LASTNAME, FIRSTNAME MIDDLENAME" — blank parts are dropped.
     */
    public function displayName(): string
    {
        $data = $this->personalData;

        $given = trim(implode(' ', array_filter([$data?->firstname, $data?->middlename])));
        $last = trim((string) $data?->lastname);

        return trim(implode(', ', array_filter([$last, $given]))) ?: 'Unnamed guarantor';
    }
}
