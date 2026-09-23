<?php

namespace App\Models\Bizbox;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

class PatientTransaction extends Model
{
    protected $connection = 'sqlsrv';

    protected $table = 'psPatRegisters';

    protected $primaryKey = 'PK_psPatRegisters';

    public $timestamps = false;

    /**
     * Guard every attribute — this model is read-only.
     *
     * @var list<string>
     */
    protected $guarded = ['*'];

    /**
     * The lookup vocabularies a transaction points at: FK column => relation.
     *
     * FK_emdPatients is deliberately absent — the patient is not a vocabulary
     * and is loaded by name wherever it is wanted.
     *
     * @var array<string, string>
     */
    public const LOOKUPS = [
        'FK_mscHospPlan' => 'hospitalPlan',
        'FK_mscDiscounts' => 'discount',
        'FK_mscServiceType' => 'serviceType',
        'FK_mscHospCaseTypes' => 'caseType',
        'FK_mscPHICMemberships' => 'membership',
        'FK_mscHospTranTypes' => 'transactionType',
        'FK_mscAdmResults' => 'admissionResult',
    ];

    /**
     * Where the column listing behind withLookups() is remembered.
     */
    protected const COLUMN_CACHE_KEY = 'bizbox.psPatRegisters.columns';

    public function patient()
    {
        return $this->belongsTo(HospitalPatient::class, 'FK_emdPatients');
    }

    public function guarantors()
    {
        return $this->hasMany(PatientGuarantors::class, 'FK_psPatRegisters');
    }

    public function hospitalPlan()
    {
        return $this->belongsTo(HospitalPlan::class, 'FK_mscHospPlan', 'PK_mscHospPlan');
    }

    public function discount()
    {
        return $this->belongsTo(Discount::class, 'FK_mscDiscounts', 'PK_mscDiscounts');
    }

    public function serviceType()
    {
        return $this->belongsTo(ServiceType::class, 'FK_mscServiceType', 'PK_mscServiceType');
    }

    public function caseType()
    {
        return $this->belongsTo(HospitalCaseType::class, 'FK_mscHospCaseTypes', 'PK_mscHospCaseTypes');
    }

    public function membership()
    {
        return $this->belongsTo(Membership::class, 'FK_mscPHICMemberships', 'PK_mscPHICMemberships');
    }

    /**
     * The kind of encounter this is. Named transactionType(), not transaction():
     * on a class already called PatientTransaction the bare name would read as
     * "the transaction of this transaction", and PatientGuarantors::transaction()
     * already uses that word for the encounter itself.
     */
    public function transactionType()
    {
        return $this->belongsTo(TransactionType::class, 'FK_mscHospTranTypes', 'PK_mscHospTranTypes');
    }

    public function admissionResult()
    {
        return $this->belongsTo(AdmissionResult::class, 'FK_mscAdmResults', 'PK_mscAdmResults');
    }

    /**
     * Eager-load the lookup vocabularies — but only those whose FK column is
     * actually present on the live Bizbox table.
     *
     * Declaring a relation is free; eager-loading one is not. `with()` selects
     * the FK column, so a name this app guessed wrong is `Invalid column name`
     * against a database no test can reach. Only PK_psPatRegisters,
     * FK_emdPatients and registrydate are proven (docs/TRANSACTION_MODULE_PLAN.md
     * §C); the seven FKs in self::LOOKUPS are read off Bizbox's own comments.
     *
     * Filtering against the real column listing turns a wrong guess into a
     * missing JSON key instead of a 500 — the same net whenHas() gives the HIS
     * resources, and under the same rule: a net, not a licence to guess. When §C
     * verifies the names, delete this and inline a plain with([...]).
     */
    public function scopeWithLookups(Builder $query): Builder
    {
        return $query->with(array_values(array_intersect_key(
            self::LOOKUPS,
            array_flip($this->lookupColumns()),
        )));
    }

    /**
     * The columns psPatRegisters really has, remembered across requests.
     *
     * An unreachable HIS is not cached: caching [] would disable every lookup
     * until someone cleared the cache by hand, long after the SQL Server came
     * back.
     *
     * @return list<string>
     */
    protected function lookupColumns(): array
    {
        $cached = Cache::get(self::COLUMN_CACHE_KEY);

        if (is_array($cached)) {
            return $cached;
        }

        try {
            $columns = Schema::connection($this->getConnectionName())
                ->getColumnListing($this->getTable());
        } catch (QueryException $e) {
            report($e);

            return [];
        }

        Cache::forever(self::COLUMN_CACHE_KEY, $columns);

        return $columns;
    }
}
