<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Guarantee approval threshold
    |--------------------------------------------------------------------------
    |
    | A patient guarantee whose breakdown lines total this much (pesos) or more
    | is saved as "pending" and needs a sign-off (`guarantee.approve`) before its
    | Acknowledgement Slip prints. Smaller ones need none.
    |
    */

    'guarantee_approval_threshold' => (float) env('MSS_GUARANTEE_APPROVAL_THRESHOLD', 50000),

];
