<?php

namespace App\Models\Bizbox;

use Illuminate\Database\Eloquent\Model;

class AdmissionResult extends Model
{
    protected $connection = 'sqlsrv';

    protected $table = 'mscAdmResults';

    protected $primaryKey = 'PK_mscAdmResults';

    public $timestamps = false;

    /**
     * Guard every attribute — this model is read-only.
     *
     * @var list<string>
     */
    protected $guarded = ['*'];
}
