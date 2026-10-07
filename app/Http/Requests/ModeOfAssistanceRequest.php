<?php

namespace App\Http\Requests;

/** Create or update a mode of assistance; on update every field is optional. */
class ModeOfAssistanceRequest extends AssessmentLookupRequest
{
    protected function table(): string
    {
        return 'mode_of_assistances';
    }

    protected function routeKey(): string
    {
        return 'modeOfAssistance';
    }
}
