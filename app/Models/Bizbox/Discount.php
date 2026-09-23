<?php

namespace App\Models\Bizbox;

use Illuminate\Database\Eloquent\Model;

class Discount extends Model
{
    protected $connection = 'sqlsrv';

    protected $table = 'mscDiscounts';

    protected $primaryKey = 'PK_mscDiscounts';

    public $timestamps = false;

    /**
     * Guard every attribute — this model is read-only.
     *
     * @var list<string>
     */
    protected $guarded = ['*'];
}
