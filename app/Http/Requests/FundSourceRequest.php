<?php

namespace App\Http\Requests;

/** Create or update a fund source; on update every field is optional. */
class FundSourceRequest extends AssessmentLookupRequest
{
    protected function table(): string
    {
        return 'fund_sources';
    }

    protected function routeKey(): string
    {
        return 'fundSource';
    }

    protected function extraRules(): array
    {
        return [
            'requires_specify' => ['sometimes', 'boolean'],
        ];
    }
}
