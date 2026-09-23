<?php

namespace App\Models\Bizbox;

use Illuminate\Database\Eloquent\Model;

class HospitalPlan extends Model
{
    protected $connection = 'sqlsrv';

    protected $table = 'mscHospPlan';

    protected $primaryKey = 'PK_mscHospPlan';

    /**
     * Alone among the HIS lookups, this table is keyed by a code, not a number:
     * PK_mscHospPlan is nvarchar(20) holding values like 'COM', and
     * psPatRegisters.FK_mscHospPlan matches it as nvarchar(20).
     *
     * Left at Eloquent's default 'int', Relation::whereInMethod() picks
     * whereIntegerInRaw() for the eager load, which casts every key with (int) —
     * 'COM' becomes 0, and SQL Server then fails converting the nvarchar column
     * to int. Verified against smartapp8 on 2026-09-21.
     */
    protected $keyType = 'string';

    public $incrementing = false;

    public $timestamps = false;

    /**
     * Guard every attribute — this model is read-only.
     *
     * @var list<string>
     */
    protected $guarded = ['*'];
}
