<?php

namespace App\Models\Bizbox;

use Illuminate\Database\Eloquent\Model;

class HospitalCaseType extends Model
{
    protected $connection = 'sqlsrv';

    protected $table = 'mscHospCaseTypes';

    protected $primaryKey = 'PK_mscHospCaseTypes';

    public $timestamps = false;

    /**
     * Guard every attribute — this model is read-only.
     *
     * @var list<string>
     */
    protected $guarded = ['*'];
}
