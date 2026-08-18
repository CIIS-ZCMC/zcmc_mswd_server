<?php

namespace App\Http\Controllers;

use App\Http\Resources\CaseActivityResource;
use App\Models\CaseModel;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CaseActivitiesController extends Controller
{
    /**
     * The case_activities milestone timeline (case_opened, reassigned, closed…).
     */
    public function __invoke(CaseModel $case): AnonymousResourceCollection
    {
        return CaseActivityResource::collection(
            $case->activities()->with(['assignedUser', 'previousUser'])->latest('activity_date')->get(),
        );
    }
}
