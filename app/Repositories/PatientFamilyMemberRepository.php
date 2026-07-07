<?php

namespace App\Repositories;

use App\Models\PatientFamilyMember;
use App\Repositories\Contracts\PatientFamilyMemberRepositoryInterface;

class PatientFamilyMemberRepository extends BaseRepository implements PatientFamilyMemberRepositoryInterface
{
    public function __construct(PatientFamilyMember $model)
    {
        parent::__construct($model);
    }
}
